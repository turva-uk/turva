import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";

import { App } from "../App";
import type {
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
  }: {
    detail?: OrganisationDetail;
    teamDetail?: Partial<FileTeamDetail>;
    orgList?: OrganisationDetail[];
    write?: (path: string, payload: Record<string, unknown>) => Response;
    failRefresh?: boolean;
  } = {},
) {
  const writes: { path: string; method: string; payload: Record<string, unknown> }[] = [];
  let organisationReads = 0;
  const fetcher = vi.fn(async (path: string, init: RequestInit) => {
    if (init.method !== "GET") {
      const payload = init.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : {};
      writes.push({ path, method: String(init.method), payload });
      if (write) return write(path, payload);
      if (path.endsWith("/accept/")) return json({ organisation_id: organisation.id });
      if (path.endsWith("/invitations/")) return json({ email_sent: true }, 201);
      return json({ team, head_sha: "b".repeat(40) });
    }
    if (path.endsWith("/auth/session/")) return json({ user: person, authenticated: true });
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
    <MantineProvider>
      <RouterProvider router={router} />
    </MantineProvider>,
  );
  return { actor: userEvent.setup(), writes, fetcher };
}

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

it("sends membership invitations only on deliberate save and reports failed delivery", async () => {
  const { actor, writes } = start("/organisations/riverbank", {
    write: () => json({ email_sent: false }, 201),
  });
  const email = await screen.findByRole("textbox", { name: "Invitee's email address" });
  await actor.type(email, "fictional-invitee@example.org");
  expect(writes).toHaveLength(0);
  await actor.click(screen.getByRole("button", { name: "Send membership invitation" }));
  await screen.findByText(/email could not be sent/);
  expect(email).toHaveValue("fictional-invitee@example.org");
  expect(writes[0]!.payload).toEqual({ email: "fictional-invitee@example.org" });
});

it("requires confirmation to remove a role and keeps stale membership decisions", async () => {
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
  const member = await screen.findByRole("group", {
    name: `${colleague.name} (${colleague.email})`,
  });
  await actor.click(
    within(member).getByRole("checkbox", { name: "Appointed Clinical Safety Officer" }),
  );
  const save = within(member).getByRole("button", { name: `Save roles for ${colleague.name}` });
  // The shared submit button stays focusable while unavailable: it says so
  // with aria-disabled, and a press sends nothing.
  expect(save).toHaveAttribute("aria-disabled", "true");
  await actor.click(save);
  expect(writes).toHaveLength(0);
  await actor.click(within(member).getByRole("checkbox", { name: /I understand/ }));
  await actor.click(save);
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
  await waitFor(() => expect(writes).toHaveLength(2));
  expect(writes[1]!.payload.expected_revision).toBe(colleague.revision);
});

it("shows members but no administrative controls to an ordinary member", async () => {
  start("/organisations/riverbank", {
    detail: { ...organisation, membership: { ...self, is_administrator: false } },
  });
  await screen.findByRole("table", { name: "Active members of this organisation" });
  expect(screen.queryByRole("button", { name: /Save roles/ })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Send membership invitation" }),
  ).not.toBeInTheDocument();
});

it("requires explicit adoption and sends only opened CSO appointments on whole-team save", async () => {
  const { actor, writes } = start("/safety-files/demo/team", { teamDetail: { team: null } });
  const select = await screen.findByRole("combobox", { name: "Organisation for this file" });
  const save = screen.getByRole("button", { name: "Adopt file into this organisation" });
  expect(select).toHaveValue("");
  expect(save).toBeDisabled();
  await actor.selectOptions(select, organisation.id);
  expect(screen.getByRole("combobox", { name: "One accountable CSO" })).toHaveValue(self.id);
  await actor.click(
    screen.getByRole("checkbox", { name: `${colleague.name} (${colleague.email})` }),
  );
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
  expect(
    screen.getByRole("checkbox", { name: `${colleague.name} (${colleague.email})` }),
  ).not.toBeChecked();
});

it("accepts an invitation only on click and never sends the fragment token in a URL", async () => {
  const { actor, writes, fetcher } = start(
    "/organisations/invitations/fictional-invitation#fictional-secret-token",
  );
  const accept = await screen.findByRole("button", { name: "Accept invitation" });
  expect(writes).toHaveLength(0);
  await actor.click(accept);
  await screen.findByText("Membership accepted");
  expect(writes[0]!.payload).toEqual({ token: "fictional-secret-token" });
  expect(fetcher.mock.calls.every(([url]) => !url.includes("fictional-secret-token"))).toBe(
    true,
  );
});

it("does not invent an eligible organisation or silently change an owner-controlled file", async () => {
  const { writes } = start("/safety-files/demo/team", {
    teamDetail: { team: null, choices: [] },
  });
  await screen.findByText("No eligible organisation appointment");
  expect(
    screen.queryByRole("button", { name: "Adopt file into this organisation" }),
  ).not.toBeInTheDocument();
  expect(writes).toHaveLength(0);
});

it("does not claim an already recorded change failed when its follow-up read is unavailable", async () => {
  const { actor, writes } = start("/organisations/riverbank", { failRefresh: true });
  await actor.type(
    await screen.findByRole("textbox", { name: "Invitee's email address" }),
    "fictional-new-member@example.org",
  );
  await actor.click(screen.getByRole("button", { name: "Send membership invitation" }));
  await screen.findByText("Change recorded; view not refreshed");
  expect(
    screen.getByText("Invitation email sent. It expires in seven days."),
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
  await actor.click(
    await screen.findByRole("button", { name: `Revoke invitation to ${invitation.email}` }),
  );
  expect(writes).toHaveLength(0);
  await actor.click(await screen.findByRole("button", { name: "Keep invitation" }));
  expect(writes).toHaveLength(0);
  await actor.click(
    screen.getByRole("button", { name: `Revoke invitation to ${invitation.email}` }),
  );
  await actor.click(
    await screen.findByRole("button", { name: "Confirm invitation revocation" }),
  );
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]!.path).toBe(
    "/api/v1/organisations/riverbank/invitations/fictional-invitation/revoke/",
  );
});
