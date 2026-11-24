import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";

import { App } from "../App";
import type { Hazard, Mitigation, SafetyFile, User } from "../api/types";
import { SessionProvider } from "../auth/SessionProvider";

const person: User = {
  id: "demo-user",
  email: "cso@example.org",
  first_name: "Anita",
  last_name: "Patel",
  full_name: "Anita Patel",
  organisation: "Fictional Federation",
  job_role: "CSO",
  professional_regulator: "GMC",
  registration_number: "7654321",
  professional_registration: "GMC 7654321",
  registration_verified: false,
  is_cso: true,
  cso_declared_at: "2026-11-11",
  is_verified: true,
  is_staff: false,
};
const file: SafetyFile = {
  id: "demo-file",
  slug: "demo",
  name: "Fictional deployment",
  standard: "DCB0160",
  standard_display: "DCB0160 - deploying a system",
  organisation: "Fictional Federation",
  owner_name: "Anita Patel",
  visibility: "private",
  url: "/safety-files/demo",
  exists_on_disk: true,
  created_at: "2026-11-11",
  updated_at: "2026-11-11",
};
const hazard: Hazard = {
  id: "HAZ-001",
  title: "Fictional delayed review",
  owner: person.email,
  status: "open",
  created: "2026-11-11",
  updated: "2026-11-11",
  cause: "Delay",
  effect: "Delayed care",
  harm: "Avoidable harm",
  initial: { severity: 4, likelihood: 3, risk_level: 4, risk_label: "Mandatory elimination" },
  residual: {
    severity: 4,
    likelihood: 1,
    risk_level: 2,
    risk_label: "Acceptable if cost of reduction exceeds benefit",
  },
  mitigations: ["MIT-001"],
  justification: "Daily review",
  body: "Fictional narrative.",
  requires_elimination: false,
};
const mitigation: Mitigation = {
  id: "MIT-001",
  title: "Fictional daily safety-netting",
  owner: person.email,
  status: "proposed",
  control_type: "procedural",
  created: "2026-11-11",
  updated: "2026-11-11",
  hazards: [hazard.id],
  evidence: "A fictional report.\n",
  body: "## Notes\n\nFictional only.\n",
};
const head = "a".repeat(40);

/** Choose an option in one of the catalogue's selects: open it, then pick. */
async function choose(actor: ReturnType<typeof userEvent.setup>, name: string, option: string) {
  await actor.click(screen.getByRole("combobox", { name }));
  await actor.click(await screen.findByRole("option", { name: option }));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function start({
  editing = false,
  canEdit = true,
  write,
}: {
  editing?: boolean;
  canEdit?: boolean;
  write?: (body: Record<string, unknown>) => Response;
} = {}) {
  let recorded = mitigation;
  const writes: Record<string, unknown>[] = [];
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    if (init.method !== "GET") {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      writes.push(body);
      if (write) return write(body);
      recorded = { ...mitigation, ...body } as Mitigation;
      return json({ mitigation: recorded, head_sha: "b".repeat(40) }, editing ? 200 : 201);
    }
    if (url.endsWith("/auth/session/")) return json({ user: person, authenticated: true });
    if (url.endsWith("/mitigation-options/"))
      return json({
        statuses: ["proposed", "implemented", "verified", "withdrawn"],
        control_types: ["elimination", "technical", "warning", "procedural"],
      });
    if (url.endsWith("/mitigations/MIT-001/"))
      return json({
        safety_file: file,
        can_edit: canEdit,
        mitigation: recorded,
        hazards: [hazard],
        history: [],
        problems: [],
        head_sha: head,
      });
    if (url.endsWith("/safety-files/demo/"))
      return json({
        safety_file: file,
        can_edit: canEdit,
        repository_missing: false,
        hazards: [hazard],
        mitigations: [recorded],
        head_sha: head,
      });
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <MantineProvider env="test">
      <MemoryRouter
        initialEntries={[
          editing
            ? "/safety-files/demo/mitigations/MIT-001/edit"
            : "/safety-files/demo/mitigations/new?hazard=HAZ-001",
        ]}
      >
        <SessionProvider>
          <App />
        </SessionProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
  return { actor: userEvent.setup(), writes, fetcher };
}

it("records a control and explicit hazard links only on a deliberate whole-form save", async () => {
  const { actor, writes } = start();
  const title = await screen.findByRole("textbox", { name: "Mitigation title" });
  expect(screen.getByRole("combobox", { name: "Control type" })).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "Mitigation status" })).toHaveValue("Proposed");
  await actor.type(title, "A fictional control");
  await choose(actor, "Control type", "Technical");
  expect(writes).toHaveLength(0);
  await actor.click(screen.getByRole("button", { name: "Save mitigation" }));
  await screen.findByRole("heading", { name: "MIT-001: A fictional control" });
  expect(writes).toEqual([
    expect.objectContaining({
      title: "A fictional control",
      owner: person.email,
      status: "proposed",
      control_type: "technical",
      hazards: [hazard.id],
      expected_head: head,
    }),
  ]);
  for (const field of ["id", "created", "updated", "initial", "residual", "risk_level"])
    expect(writes[0]).not.toHaveProperty(field);
  expect(
    screen.getByRole("link", { name: "HAZ-001: Fictional delayed review" }),
  ).toBeInTheDocument();
});

it("retains a stale mitigation draft, its links and its original opened version", async () => {
  const { actor, writes, fetcher } = start({
    editing: true,
    write: () =>
      json({ detail: "This safety file changed after you opened it. Nothing was saved." }, 409),
  });
  const title = await screen.findByRole("textbox", { name: "Mitigation title" });
  await actor.clear(title);
  await actor.type(title, "Unsaved control judgement");
  await actor.click(screen.getByRole("button", { name: "Save mitigation" }));
  expect(
    await screen.findByText(/This safety file changed after you opened it/),
  ).toBeInTheDocument();
  expect(title).toHaveValue("Unsaved control judgement");
  const compare = screen.getByRole("link", { name: /Open the latest recorded version/ });
  expect(compare).toHaveAttribute("target", "_blank");
  expect(compare).toHaveAttribute("href", "/safety-files/demo/mitigations/MIT-001");
  await actor.click(screen.getByRole("button", { name: "Save mitigation" }));
  await waitFor(() => expect(writes).toHaveLength(2));
  expect(writes.every((value) => value.expected_head === head)).toBe(true);
  expect(writes[0]).toMatchObject({
    hazards: mitigation.hazards,
    evidence: mitigation.evidence,
    body: mitigation.body,
  });
  expect(
    fetcher.mock.calls.filter(
      ([url, init]) => url.endsWith("/mitigations/MIT-001/") && init.method === "GET",
    ),
  ).toHaveLength(1);
});

it("shows field validation without clearing evidence and asks for evidence on verification", async () => {
  const { actor } = start({
    editing: true,
    write: () => json({ evidence: ["Record verification evidence."] }, 400),
  });
  await screen.findByRole("textbox", { name: "Mitigation title" });
  await choose(actor, "Mitigation status", "Verified");
  const evidence = screen.getByRole("textbox", {
    name: "Implementation and verification evidence",
  });
  expect(evidence).toBeRequired();
  await actor.click(screen.getByRole("button", { name: "Save mitigation" }));
  // The server's message shows under the field it names, as that field's
  // description, not only in the summary above the form.
  await waitFor(() =>
    expect(evidence).toHaveAccessibleDescription(/Record verification evidence\./),
  );
  expect(evidence).toHaveValue(mitigation.evidence);
  expect(evidence).toHaveAttribute("aria-invalid", "true");
});

it("does not offer mutation controls for a reader", async () => {
  const { writes } = start({ canEdit: false });
  await screen.findByText("Read-only safety file");
  expect(screen.queryByRole("button", { name: "Save mitigation" })).not.toBeInTheDocument();
  expect(writes).toHaveLength(0);
});

it("lets keyboard users explicitly remove a linked hazard without clearing the evidence", async () => {
  const { actor, writes } = start({ editing: true });
  const remove = await screen.findByRole("button", {
    name: "Remove HAZ-001 from linked hazards",
  });
  remove.focus();
  await actor.keyboard("{Enter}");
  expect(
    screen.queryByRole("button", { name: "Remove HAZ-001 from linked hazards" }),
  ).not.toBeInTheDocument();
  await actor.click(screen.getByRole("button", { name: "Save mitigation" }));
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]).toMatchObject({
    hazards: [],
    evidence: mitigation.evidence,
    body: mitigation.body,
  });
});
