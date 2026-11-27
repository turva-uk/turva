import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App";
import type {
  InvitationPreview,
  FileTeam,
  FileTeamDetail,
  OrganisationDetail,
  OrganisationMember,
  User,
} from "../api/types";
import { SessionProvider } from "../auth/SessionProvider";

const person: User = {
  id: "person",
  email: "anita@riverbank.example.nhs.uk",
  first_name: "Anita",
  last_name: "Patel",
  full_name: "Anita Patel",
  organisation: "Fictional Riverbank Federation",
  job_role: "CSO",
  professional_regulator: "GMC",
  registration_number: "7654321",
  professional_registration: "GMC 7654321",
  registration_verified: false,
  is_cso: true,
  cso_declared_at: "2026-11-13T10:00:00Z",
  is_verified: true,
  is_staff: false,
};
const self: OrganisationMember = {
  id: "self-member",
  user_id: person.id,
  name: person.full_name,
  email: person.email,
  active: true,
  is_administrator: true,
  is_cso: true,
  eligible_cso: true,
  profile_declared: true,
  revision: 4,
  appointment_id: "self-appointment",
};
const colleague: OrganisationMember = {
  ...self,
  id: "colleague-member",
  user_id: "colleague",
  name: "Fictional Joseph Okafor",
  email: "joseph@riverbank.example.nhs.uk",
  is_administrator: false,
  revision: 2,
  appointment_id: "colleague-appointment",
};
const organisation: OrganisationDetail = {
  id: "riverbank",
  name: "Fictional Riverbank Federation",
  membership: self,
  members: [self, colleague],
  invitations: [],
  files: [],
  events: [],
};
const head = "a".repeat(40);
const team: FileTeam = {
  organisation_id: organisation.id,
  organisation_name: organisation.name,
  accountable: {
    user_id: self.user_id,
    membership_id: self.id,
    appointment_id: self.appointment_id!,
    name: self.name,
    email: self.email,
  },
  collaborators: [
    {
      user_id: colleague.user_id,
      membership_id: colleague.id,
      appointment_id: colleague.appointment_id!,
      name: colleague.name,
      email: colleague.email,
    },
  ],
  reason: "Previous fictional team decision.",
};
const choices = [{ id: organisation.id, name: organisation.name, csos: [self, colleague] }];

const invitationPreview: InvitationPreview = {
  organisation_name: "Fictional Riverbank Federation",
  inviter_name: "Grace Okafor",
  email: person.email,
  expires_at: "2026-12-03T10:00:00Z",
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function start(
  route: string,
  {
    detail = organisation,
    teamDetail,
    write,
    orgList = [organisation],
    failRefresh = false,
    preview = () => json(invitationPreview),
    signedOut = false,
  }: {
    detail?: OrganisationDetail;
    teamDetail?: Partial<FileTeamDetail>;
    orgList?: OrganisationDetail[];
    write?: (path: string, payload: Record<string, unknown>) => Response;
    failRefresh?: boolean;
    preview?: () => Response;
    signedOut?: boolean;
  } = {},
) {
  const writes: { path: string; method: string; payload: Record<string, unknown> }[] = [];
  const previews: Record<string, unknown>[] = [];
  let organisationReads = 0;
  const fetcher = vi.fn(async (path: string, init: RequestInit) => {
    if (init.method !== "GET") {
      const payload = init.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : {};
      // Reading what an invitation is for changes nothing, so it is not a write.
      if (path.endsWith("/preview/")) {
        previews.push(payload);
        return preview();
      }
      writes.push({ path, method: String(init.method), payload });
      if (write) return write(path, payload);
      if (path.endsWith("/accept/")) return json({ organisation_id: organisation.id });
      if (path.endsWith("/invitations/")) return json({ email_sent: true }, 201);
      return json({ team, head_sha: "b".repeat(40) });
    }
    if (path.endsWith("/auth/session/"))
      return signedOut
        ? json({ user: null, authenticated: false })
        : json({ user: person, authenticated: true });
    if (path.endsWith("/organisations/")) return json(orgList);
    if (path.endsWith("/organisations/riverbank/")) {
      organisationReads += 1;
      return failRefresh && organisationReads > 1
        ? json({ detail: "View unavailable" }, 503)
        : json(detail);
    }
    if (path.endsWith("/safety-files/demo/team/"))
      return json({
        file_name: "Fictional deployment",
        slug: "demo",
        can_manage: true,
        team,
        head_sha: head,
        choices,
        ...teamDetail,
      });
    if (path.endsWith("/safety-files/")) return json([]);
    throw new Error(`Unexpected request ${path}`);
  });
  vi.stubGlobal("fetch", fetcher);
  // A data router, as `main.tsx` uses: the shared `Form` guards leaving a
  // dirty form only inside one, and refuses to render outside it.
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <SessionProvider>
            <App />
          </SessionProvider>
        ),
      },
    ],
    { initialEntries: [route] },
  );
  render(
    <MantineProvider env="test">
      <RouterProvider router={router} />
    </MantineProvider>,
  );
  return { actor: userEvent.setup(), writes, previews, fetcher };
}

it("names the organisation under Organisations in the side bar, with no link back", async () => {
  start("/organisations/riverbank");

  const navigation = await screen.findByRole("navigation", { name: "Main navigation" });
  const sublink = await within(navigation).findByRole("link", { name: organisation.name });

  expect(sublink).toHaveAttribute("href", `/organisations/${organisation.id}`);
  expect(sublink).toHaveAttribute("aria-current", "page");
  expect(
    screen.queryByRole("link", { name: "Back to your organisations" }),
  ).not.toBeInTheDocument();
});

it("names the file and its team beneath Safety files in the side bar, with no link elsewhere", async () => {
  start("/safety-files/demo/team");

  const navigation = await screen.findByRole("navigation", { name: "Main navigation" });
  const team = await within(navigation).findByRole("link", { name: "File team" });

  // The trail reads down the side bar: Safety files, the file, its team.
  expect(
    within(navigation)
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]),
  ).toEqual([
    ["Safety files", "/safety-files"],
    ["Fictional deployment", "/safety-files/demo"],
    ["File team", "/safety-files/demo/team"],
    ["Settings", "/settings"],
    ["Organisations", "/organisations"],
  ]);
  expect(team).toHaveAttribute("aria-current", "page");
  expect(
    within(navigation).getByRole("link", { name: "Fictional deployment" }),
  ).not.toHaveAttribute("aria-current");
  expect(screen.queryByRole("link", { name: "Your organisations" })).not.toBeInTheDocument();
});

it("shows an honest empty organisation state without an invitation or file grant", async () => {
  const { writes } = start("/organisations", { orgList: [] });
  await screen.findByText(/You have no active organisation memberships/);
  expect(writes).toHaveLength(0);
});

it("lists each organisation with its reference, your role and your CSO appointment", async () => {
  const { writes } = start("/organisations");

  const link = await screen.findByRole("link", { name: organisation.name });

  expect(link).toHaveAttribute("href", `/organisations/${organisation.id}`);
  const row = link.closest("tr");
  expect(row).toHaveTextContent(organisation.id);
  expect(row).toHaveTextContent("Organisation administrator");
  expect(row).toHaveTextContent("Appointed CSO");
  expect(writes).toHaveLength(0);
});

it("filters the organisations list by your role in each", async () => {
  const other: OrganisationDetail = {
    ...organisation,
    id: "hillside",
    name: "Fictional Hillside Practice",
    membership: { ...self, is_administrator: false },
  };
  const { actor } = start("/organisations", { orgList: [organisation, other] });
  await screen.findByRole("link", { name: other.name });

  await actor.click(screen.getByRole("button", { name: "Filter organisations" }));
  await actor.click(screen.getByLabelText("Filter organisations", { selector: "input" }));
  await actor.click(await screen.findByRole("option", { name: "Member" }));

  expect(screen.getByRole("link", { name: other.name })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: organisation.name })).not.toBeInTheDocument();
});

it("filters an organisation's members by administration and sorts them by name", async () => {
  const { actor } = start("/organisations/riverbank", {
    detail: { ...organisation, membership: { ...self, is_administrator: false } },
  });
  const table = await screen.findByRole("table", { name: "Members of this organisation" });

  await actor.click(screen.getByRole("button", { name: "Sort by Person" }));
  await actor.click(screen.getByRole("button", { name: "Sort by Person" }));
  const rows = within(table).getAllByRole("row").slice(1);
  expect(rows[0]).toHaveTextContent(colleague.name);
  expect(rows[1]).toHaveTextContent(self.name);

  await actor.click(screen.getByRole("button", { name: "Filter members" }));
  await actor.click(screen.getByLabelText("Filter members", { selector: "input" }));
  await actor.click(await screen.findByRole("option", { name: "Administrator" }));
  expect(within(table).getAllByRole("row")).toHaveLength(2);
  expect(table).toHaveTextContent(self.name);
});

it("filters invitations by where each stands", async () => {
  const pending = {
    id: "fictional-pending",
    email: "fictional-pending@example.org",
    created_at: "2026-11-13T10:00:00Z",
    expires_at: "2099-11-20T10:00:00Z",
    accepted_at: null,
    revoked_at: null,
  };
  const accepted = {
    ...pending,
    id: "fictional-accepted",
    email: "fictional-accepted@example.org",
    accepted_at: "2026-11-14T10:00:00Z",
  };
  const { actor } = start("/organisations/riverbank", {
    detail: { ...organisation, invitations: [pending, accepted] },
  });
  await screen.findByText(accepted.email);

  await actor.click(screen.getByRole("button", { name: "Filter invitations" }));
  await actor.click(screen.getByLabelText("Filter invitations", { selector: "input" }));
  await actor.click(await screen.findByRole("option", { name: "Accepted" }));

  expect(screen.getByText(accepted.email)).toBeInTheDocument();
  expect(screen.queryByText(pending.email)).not.toBeInTheDocument();
});

it("sends membership invitations only on deliberate save and reports failed delivery", async () => {
  const { actor, writes } = start("/organisations/riverbank", {
    write: () => json({ email_sent: false }, 201),
  });
  // Inviting starts from the add button in the bar of the Invitations table.
  expect(await screen.findByRole("heading", { name: "Invitations" })).toBeInTheDocument();
  await actor.click(screen.getByRole("button", { name: "Invite a member" }));
  const dialog = await screen.findByRole("dialog", { name: "Invite a member" });
  await actor.type(
    within(dialog).getByRole("textbox", { name: "Invitee's email address" }),
    "fictional-invitee@example.org",
  );
  expect(writes).toHaveLength(0);
  await actor.click(within(dialog).getByRole("button", { name: "Send membership invitation" }));
  // A recorded invitation whose email failed is a warning, never a plain success.
  await within(dialog).findByText("Invitation recorded, email not sent");
  expect(within(dialog).getByText(/email could not be sent/)).toBeInTheDocument();
  expect(writes[0]!.payload).toEqual({ email: "fictional-invitee@example.org" });
});

it("asks before taking a role away and keeps stale membership decisions", async () => {
  const { actor, writes } = start("/organisations/riverbank", {
    write: () =>
      json(
        {
          detail:
            "This membership changed after you opened it. Reload before making a new decision.",
        },
        409,
      ),
  });
  const member = await screen.findByRole("group", { name: colleague.name });
  // The email is the group's description, on its own line under the name.
  expect(member).toHaveAccessibleDescription(colleague.email);
  await actor.click(
    within(member).getByRole("checkbox", { name: "Appointed Clinical Safety Officer" }),
  );
  const save = within(member).getByRole("button", { name: `Save roles for ${colleague.name}` });

  // Taking a role away asks first, naming what is lost, and sends nothing
  // until the change is confirmed.
  await actor.click(save);
  const ask = await screen.findByRole("dialog", {
    name: `Change roles for ${colleague.name}?`,
  });
  expect(ask).toHaveTextContent(
    `${colleague.name} will lose their CSO appointment. Removing a CSO appointment removes private file access.`,
  );
  await actor.click(within(ask).getByRole("button", { name: "Keep current roles" }));
  expect(writes).toHaveLength(0);
  expect(
    within(member).getByRole("checkbox", { name: "Appointed Clinical Safety Officer" }),
  ).not.toBeChecked();

  await actor.click(save);
  await actor.click(
    within(
      await screen.findByRole("dialog", { name: `Change roles for ${colleague.name}?` }),
    ).getByRole("button", { name: "Save role changes" }),
  );
  await screen.findByText(/This membership changed after you opened it/);
  expect(
    within(member).getByRole("checkbox", { name: "Appointed Clinical Safety Officer" }),
  ).not.toBeChecked();
  expect(writes[0]!.payload).toEqual({
    expected_revision: colleague.revision,
    active: true,
    is_administrator: false,
    is_cso: false,
  });
  await actor.click(save);
  await actor.click(
    within(
      await screen.findByRole("dialog", { name: `Change roles for ${colleague.name}?` }),
    ).getByRole("button", { name: "Save role changes" }),
  );
  await waitFor(() => expect(writes).toHaveLength(2));
  expect(writes[1]!.payload.expected_revision).toBe(colleague.revision);
});

it("saves a role being added straight away, without asking", async () => {
  const { actor, writes } = start("/organisations/riverbank");
  const member = await screen.findByRole("group", { name: colleague.name });

  await actor.click(
    within(member).getByRole("checkbox", { name: "Organisation administrator" }),
  );
  await actor.click(
    within(member).getByRole("button", { name: `Save roles for ${colleague.name}` }),
  );

  await waitFor(() => expect(writes).toHaveLength(1));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(writes[0]!.payload).toMatchObject({ is_administrator: true, is_cso: true });
});

it("groups the invitations, the file teams and the history into a card each", async () => {
  start("/organisations/riverbank");
  await screen.findByRole("heading", { name: "Invitations" });
  const cardOf = (name: string): HTMLElement => {
    const card = screen.getByRole("heading", { name }).closest(".mantine-Card-root");
    if (!(card instanceof HTMLElement)) throw new Error(`No card holds "${name}"`);

    return card;
  };

  const invitations = cardOf("Invitations");

  // The add button sits in the invitations table's own bar, inside its card.
  expect(
    within(invitations).getByRole("button", { name: "Invite a member" }),
  ).toBeInTheDocument();
  expect(
    new Set([
      invitations,
      cardOf("This organisation's safety files"),
      cardOf("Recent administration history"),
    ]).size,
  ).toBe(3);
});

it("names each of the administrator's tables for a screen reader", async () => {
  start("/organisations/riverbank", {
    detail: {
      ...organisation,
      invitations: [
        {
          id: "fictional-invitation",
          email: "fictional-invitee@example.org",
          created_at: "2026-11-13T10:00:00Z",
          expires_at: "2099-11-20T10:00:00Z",
          accepted_at: null,
          revoked_at: null,
        },
      ],
      events: [
        {
          created_at: "2026-11-13T10:00:00Z",
          action: "invitation sent",
          subject: "fictional-invitee@example.org",
          actor__email: self.email,
          subject_name: null,
          actor_name: self.name,
        },
      ],
    },
  });

  expect(await screen.findByRole("table", { name: "Invitations" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Administration history" })).toBeInTheDocument();
  expect(screen.queryByText(/Up to 100/)).not.toBeInTheDocument();
});

it("names people in the administration history, and keeps the address for somebody only invited", async () => {
  start("/organisations/riverbank", {
    detail: {
      ...organisation,
      events: [
        {
          created_at: "2026-11-13T10:00:00Z",
          action: "membership.changed",
          subject: colleague.email,
          subject_name: colleague.name,
          actor__email: self.email,
          actor_name: self.name,
        },
        {
          created_at: "2026-11-12T10:00:00Z",
          action: "invitation.issued",
          subject: "fictional-invitee@example.org",
          subject_name: null,
          actor__email: self.email,
          actor_name: self.name,
        },
      ],
    },
  });

  const table = await screen.findByRole("table", { name: "Administration history" });
  const [changed, issued] = within(table).getAllByRole("row").slice(1);

  expect(changed).toHaveTextContent(colleague.name);
  expect(changed).not.toHaveTextContent(colleague.email);
  expect(changed).toHaveTextContent(self.name);
  expect(changed).not.toHaveTextContent(self.email);
  expect(issued).toHaveTextContent("fictional-invitee@example.org");
});

it("shows when each administration event happened to the minute, without seconds", async () => {
  start("/organisations/riverbank", {
    detail: {
      ...organisation,
      events: [
        {
          created_at: "2026-11-13T10:00:00Z",
          action: "invitation sent",
          subject: "fictional-invitee@example.org",
          actor__email: self.email,
          subject_name: null,
          actor_name: self.name,
        },
      ],
    },
  });

  const table = await screen.findByRole("table", { name: "Administration history" });
  const when = within(table).getAllByRole("cell")[0];

  expect(when?.textContent).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/);
});

it("shows members but no administrative controls to an ordinary member", async () => {
  start("/organisations/riverbank", {
    detail: { ...organisation, membership: { ...self, is_administrator: false } },
  });
  await screen.findByRole("table", { name: "Members of this organisation" });
  expect(screen.queryByRole("button", { name: /Save roles/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Invite a member" })).not.toBeInTheDocument();
});

it("lists the adopted files in a table, each opening its file team", async () => {
  const { actor, fetcher } = start("/organisations/riverbank", {
    detail: {
      ...organisation,
      files: [
        { slug: "demo", name: "Fictional deployment", last_updated: "2026-11-21T09:15:00Z" },
      ],
    },
  });

  const table = await screen.findByRole("table", { name: "Adopted safety files" });
  expect(table).toHaveTextContent("Fictional deployment");
  await actor.click(
    within(table).getByRole("button", {
      name: "Fictional deployment",
    }),
  );

  await waitFor(() =>
    expect(
      fetcher.mock.calls.some(([url]) => String(url).endsWith("/safety-files/demo/team/")),
    ).toBe(true),
  );
});

it("says when each adopted file last changed, keeping the server's newest-first order", async () => {
  start("/organisations/riverbank", {
    detail: {
      ...organisation,
      files: [
        { slug: "newer", name: "Fictional newer", last_updated: "2026-11-21T09:15:00Z" },
        { slug: "older", name: "Fictional older", last_updated: "2026-11-01T09:15:00Z" },
        { slug: "unknown", name: "Fictional unknown", last_updated: null },
      ],
    },
  });

  const table = await screen.findByRole("table", { name: "Adopted safety files" });
  const rows = within(table).getAllByRole("row").slice(1);

  expect(within(table).getByRole("columnheader", { name: /Last updated/ })).toBeInTheDocument();
  expect(rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent)).toEqual([
    "Fictional newer",
    "Fictional older",
    "Fictional unknown",
  ]);
  expect(within(rows[0]!).getAllByRole("cell")[1]?.textContent).toMatch(
    /^\d{2}\/\d{2}\/2026, \d{2}:\d{2}$/,
  );
  expect(rows[2]).toHaveTextContent("Not known");
});

it("requires explicit adoption and sends only opened CSO appointments on whole-team save", async () => {
  const { actor, writes } = start("/safety-files/demo/team", { teamDetail: { team: null } });
  const select = await screen.findByRole("combobox", { name: "Organisation for this file" });
  const save = screen.getByRole("button", { name: "Adopt file into this organisation" });
  expect(select).toHaveValue("");
  // The shared submit button stays focusable while unavailable: it says so
  // with aria-disabled, and a press sends nothing.
  expect(save).toHaveAttribute("aria-disabled", "true");
  await actor.click(save);
  expect(writes).toHaveLength(0);
  // The catalogue's select is a combobox: open it, then choose.
  await actor.click(select);
  await actor.click(
    await screen.findByRole("option", {
      name: `${organisation.name} (${organisation.id.slice(0, 8)})`,
    }),
  );
  expect(screen.getByRole("combobox", { name: "One accountable CSO" })).toHaveValue(
    `${self.name} (${self.email})`,
  );
  // The collaborators are one group, named for what choosing them does,
  // and described by what being chosen allows.
  const collaborators = screen.getByRole("group", {
    name: "Explicitly named CSO collaborators",
  });
  expect(collaborators).toHaveAccessibleDescription(
    "Every selected person can read and edit the whole file. Do not use this to delegate a single mitigation.",
  );
  // Each person is named by their name alone, with their email as the
  // checkbox's own description, as on the organisation's member cards.
  const colleagueBox = within(collaborators).getByRole("checkbox", { name: colleague.name });
  expect(colleagueBox).toHaveAccessibleDescription(colleague.email);
  await actor.click(colleagueBox);
  await actor.type(
    screen.getByRole("textbox", { name: "Reason for this team decision" }),
    "Explicit fictional adoption.",
  );
  expect(writes).toHaveLength(0);
  await actor.click(save);
  await screen.findByRole("heading", { name: "Your safety files" });
  expect(writes[0]).toMatchObject({
    method: "PUT",
    payload: {
      organisation_id: organisation.id,
      accountable_id: self.id,
      collaborator_ids: [colleague.id],
      reason: "Explicit fictional adoption.",
      expected_head: head,
      expected_appointments: {
        [self.id]: self.appointment_id,
        [colleague.id]: colleague.appointment_id,
      },
    },
  });
});

it("gives the team-change warning as guidance beside the form, not as a page state", async () => {
  start("/safety-files/demo/team", { teamDetail: { team: null } });
  const title = await screen.findByText("A team change is not a clinical judgement");

  // A guidance note sits in the page's flow as advice; a state message is
  // kept for what has happened, such as a refused save.
  const note = title.closest('[data-testid="guidance-note"]');
  expect(note).not.toBeNull();
  expect(note).toHaveTextContent("It does not change risk scores");
});

it("retains a rejected team draft and never refreshes its opened version or appointments", async () => {
  const { actor, writes, fetcher } = start("/safety-files/demo/team", {
    write: () =>
      json(
        {
          detail:
            "A selected CSO appointment changed after this form opened. Nothing was saved.",
        },
        409,
      ),
  });
  const reason = await screen.findByRole("textbox", { name: "Reason for this team decision" });
  await actor.clear(reason);
  await actor.type(reason, "Unsaved fictional team decision.");
  await actor.click(screen.getByRole("button", { name: "Save file team" }));
  await screen.findByText(/CSO appointment changed after this form opened/);
  expect(reason).toHaveValue("Unsaved fictional team decision.");
  expect(
    screen.getByRole("link", { name: /Open the latest team in another tab/ }),
  ).toHaveAttribute("target", "_blank");
  await actor.click(screen.getByRole("button", { name: "Save file team" }));
  await waitFor(() => expect(writes).toHaveLength(2));
  expect(writes.every((request) => request.payload.expected_head === head)).toBe(true);
  expect(
    fetcher.mock.calls.filter(
      ([path, init]) => path.endsWith("/team/") && init.method === "GET",
    ),
  ).toHaveLength(1);
});

it("does not preselect a renewed appointment as though an old grant was still current", async () => {
  start("/safety-files/demo/team", {
    teamDetail: {
      choices: [
        {
          ...choices[0]!,
          csos: [self, { ...colleague, appointment_id: "renewed-appointment" }],
        },
      ],
    },
  });
  await screen.findByText("Some recorded appointments are no longer current");
  expect(screen.getByRole("checkbox", { name: colleague.name })).not.toBeChecked();
});

it("accepts an invitation only on click and never sends the fragment token in a URL", async () => {
  const { actor, writes, previews, fetcher } = start(
    "/organisations/invitations/fictional-invitation#fictional-secret-token",
  );
  const accept = await screen.findByRole("button", { name: "Accept invitation" });
  expect(writes).toHaveLength(0);
  expect(previews).toEqual([{ token: "fictional-secret-token" }]);
  await actor.click(accept);
  await screen.findByText("Membership accepted");
  expect(writes[0]!.payload).toEqual({ token: "fictional-secret-token" });
  expect(
    screen.getByText("You are now a member of Fictional Riverbank Federation."),
  ).toBeInTheDocument();
  expect(fetcher.mock.calls.every(([url]) => !url.includes("fictional-secret-token"))).toBe(
    true,
  );
});

describe("the invitation page names the organisation", () => {
  it("before the accept button", async () => {
    start("/organisations/invitations/fictional-invitation#fictional-secret-token");

    const accept = await screen.findByRole("button", { name: "Accept invitation" });
    const details = screen.getByText(
      "Grace Okafor has invited you to join Fictional Riverbank Federation. The invitation expires on 3 December 2026.",
    );

    expect(
      details.compareDocumentPosition(accept) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // The card says "you"; the address is given once, below it.
    expect(details).not.toHaveTextContent(person.email);
    expect(screen.getByText(`You are signed in as ${person.email}.`)).toBeInTheDocument();
  });

  it("to a signed-out visitor, beside the welcome panel, with no accept button", async () => {
    start("/organisations/invitations/fictional-invitation#fictional-secret-token", {
      signedOut: true,
    });

    expect(
      await screen.findByText(
        "Grace Okafor has invited you to join Fictional Riverbank Federation. The invitation expires on 3 December 2026.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("welcome-panel")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(
      screen.getByText(new RegExp(`Sign in or register as ${person.email}`)),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeInTheDocument();
  });

  it("or says the invitation cannot be used, and offers nothing to accept", async () => {
    start("/organisations/invitations/fictional-invitation#wrong-token", {
      preview: () =>
        json(
          { non_field_errors: ["This invitation is invalid, expired or no longer available."] },
          400,
        ),
    });

    const alert = await screen.findByRole("alert");

    expect(within(alert).getByText("This invitation cannot be used")).toBeInTheDocument();
    expect(screen.queryByText(/Fictional Riverbank Federation/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeInTheDocument();
  });

  it("and will not accept one sent to another address", async () => {
    const { writes } = start(
      "/organisations/invitations/fictional-invitation#fictional-secret-token",
      { preview: () => json({ ...invitationPreview, email: "someone.else@example.org" }) },
    );

    expect(
      await screen.findByText("This invitation is for another address"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });
});

it("does not invent an eligible organisation or silently change an owner-controlled file", async () => {
  const { writes } = start("/safety-files/demo/team", {
    teamDetail: { team: null, choices: [] },
  });
  await screen.findByText("No eligible organisation appointment");
  expect(
    screen.queryByRole("button", { name: "Adopt file into this organisation" }),
  ).not.toBeInTheDocument();
  // With no form to cancel, the way back is a button to the file itself.
  expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Back to the safety file" })).toBeInTheDocument();
  expect(writes).toHaveLength(0);
});

it("cancels a team decision with a button beside the save, back to the file", async () => {
  const { actor, writes, fetcher } = start("/safety-files/demo/team", {
    teamDetail: { team: null },
  });
  const save = await screen.findByRole("button", { name: "Adopt file into this organisation" });
  const cancel = screen.getByRole("button", { name: "Cancel" });

  // The two sit together, as a form's actions do, and nothing else offers a way out.
  expect(save.parentElement).toBe(cancel.parentElement);
  expect(screen.queryByRole("link", { name: /Cancel and return/ })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Back to the safety file" }),
  ).not.toBeInTheDocument();

  await actor.click(cancel);

  await waitFor(() =>
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringMatching(/\/safety-files\/demo\/$/),
      expect.anything(),
    ),
  );
  expect(writes).toHaveLength(0);
});

it("does not claim an already recorded change failed when its follow-up read is unavailable", async () => {
  const { actor, writes } = start("/organisations/riverbank", { failRefresh: true });
  await actor.click(await screen.findByRole("button", { name: "Invite a member" }));
  await actor.type(
    await screen.findByRole("textbox", { name: "Invitee's email address" }),
    "fictional-new-member@example.org",
  );
  await actor.click(screen.getByRole("button", { name: "Send membership invitation" }));
  await screen.findByText("Change recorded; view not refreshed");
  expect(
    screen.getByText("The invitation email has been sent. It expires in seven days."),
  ).toBeInTheDocument();
  expect(screen.queryByText("Could not invite this member")).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /Open the latest organisation in another tab/ }),
  ).toHaveAttribute("target", "_blank");
  expect(writes).toHaveLength(1);
});

it("requires a separate confirmation before revoking an invitation", async () => {
  const invitation = {
    id: "fictional-invitation",
    email: "fictional-invitee@example.org",
    created_at: "2026-11-13T10:00:00Z",
    expires_at: "2099-11-20T10:00:00Z",
    accepted_at: null,
    revoked_at: null,
  };
  const { actor, writes } = start("/organisations/riverbank", {
    detail: { ...organisation, invitations: [invitation] },
  });
  const revokeButton = await screen.findByRole("button", {
    name: `Revoke invitation to ${invitation.email}`,
  });
  expect(revokeButton).toHaveTextContent(/^Revoke$/);
  // Starts at the cell's left edge, under the "Action" heading, rather than
  // pushed to the right by a group.
  expect(revokeButton.closest("td")?.querySelector(".mantine-Group-root")).toBeNull();
  await actor.click(revokeButton);
  expect(writes).toHaveLength(0);
  await actor.click(await screen.findByRole("button", { name: "Keep invitation" }));
  expect(writes).toHaveLength(0);
  await actor.click(
    screen.getByRole("button", { name: `Revoke invitation to ${invitation.email}` }),
  );
  await actor.click(await screen.findByRole("button", { name: "Revoke invitation" }));
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]!.path).toBe(
    "/api/v1/organisations/riverbank/invitations/fictional-invitation/revoke/",
  );
});
