import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";

import { App } from "../App";
import type { Hazard, HazardDetail, SafetyFile, User } from "../api/types";
import { SessionProvider } from "../auth/SessionProvider";

const person: User = {
  id: "demo-user",
  email: "a.patel@riverbank.example.nhs.uk",
  first_name: "Anita",
  last_name: "Patel",
  full_name: "Anita Patel",
  organisation: "Riverbank",
  job_role: "Clinical Safety Officer",
  professional_regulator: "GMC",
  registration_number: "7654321",
  professional_registration: "GMC 7654321",
  registration_verified: false,
  is_cso: true,
  cso_declared_at: "2026-11-10T12:00:00Z",
  is_verified: true,
  is_staff: false,
};
const file: SafetyFile = {
  id: "demo-file",
  slug: "demo",
  name: "Fictional deployment",
  standard: "DCB0160",
  standard_display: "DCB0160 - deploying a system",
  organisation: "Riverbank",
  owner_name: "Anita Patel",
  visibility: "private",
  url: "/safety-files/demo",
  exists_on_disk: true,
  created_at: "2026-11-10",
  updated_at: "2026-11-10",
};
const head = "a".repeat(40);
const hazard: Hazard = {
  id: "HAZ-001",
  title: "Fictional delayed review",
  owner: person.email,
  status: "open",
  created: "2026-11-10",
  updated: "2026-11-10",
  cause: "Batch review",
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
  let recorded = hazard;
  const detail = (): HazardDetail => ({
    safety_file: file,
    can_edit: canEdit,
    hazard: recorded,
    history: [],
    problems: [],
    mitigations: [],
    head_sha: head,
  });
  const writes: Record<string, unknown>[] = [];
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    if (init.method !== "GET") {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      writes.push(body);
      if (write) return write(body);
      recorded = { ...hazard, ...body } as Hazard;
      return json({ hazard: recorded, head_sha: "b".repeat(40) }, editing ? 200 : 201);
    }
    if (url.endsWith("/auth/session/")) return json({ user: person, authenticated: true });
    if (url.endsWith("/hazard-options/"))
      return json({
        severity: [
          { value: "4", label: "4 - Major" },
          { value: "5", label: "5 - Catastrophic" },
        ],
        likelihood: [
          { value: "1", label: "1 - Very low" },
          { value: "3", label: "3 - Medium" },
        ],
        statuses: ["open", "closed", "transferred"],
      });
    if (url.includes("/assessment-preview/")) {
      const selected = new URL(url, "http://localhost");
      return json(
        selected.searchParams.get("likelihood") === "1" ? hazard.residual : hazard.initial,
      );
    }
    if (url.endsWith("/hazards/HAZ-001/")) return json(detail());
    if (url.endsWith("/safety-files/demo/"))
      return json({
        safety_file: file,
        can_edit: canEdit,
        head_sha: head,
        repository_missing: false,
        hazards: [],
      });
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <MantineProvider>
      <MemoryRouter
        initialEntries={[
          editing
            ? "/safety-files/demo/hazards/HAZ-001/edit"
            : "/safety-files/demo/hazards/new",
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

it("does not assume a low risk and saves only after a deliberate whole-form action", async () => {
  const { actor, writes, fetcher } = start();
  const title = await screen.findByRole("textbox", { name: "Hazard title" });
  for (const name of [
    "Severity - initial",
    "Likelihood - initial",
    "Severity - residual",
    "Likelihood - residual",
  ]) {
    expect(screen.getByRole("combobox", { name })).toHaveValue("0");
  }
  expect(fetcher.mock.calls.some(([url]) => url.includes("assessment-preview"))).toBe(false);
  await actor.type(title, "Fictional new hazard");
  await actor.type(screen.getByRole("textbox", { name: "Cause" }), "Batch review");
  await actor.type(
    screen.getByRole("textbox", { name: "Effect on the care pathway" }),
    "Delayed care",
  );
  await actor.type(screen.getByRole("textbox", { name: "Potential harm" }), "Avoidable harm");
  await actor.selectOptions(screen.getByRole("combobox", { name: "Severity - initial" }), "4");
  await actor.selectOptions(
    screen.getByRole("combobox", { name: "Likelihood - initial" }),
    "3",
  );
  await actor.selectOptions(screen.getByRole("combobox", { name: "Severity - residual" }), "4");
  await actor.selectOptions(
    screen.getByRole("combobox", { name: "Likelihood - residual" }),
    "1",
  );
  expect(
    await screen.findByLabelText(/^residual severity 4, likelihood 1, risk level 2,/),
  ).toBeInTheDocument();
  expect(writes).toHaveLength(0);
  await actor.click(screen.getByRole("button", { name: "Save hazard" }));
  await screen.findByRole("heading", { name: "HAZ-001: Fictional new hazard" });
  expect(writes).toEqual([
    expect.objectContaining({
      expected_head: head,
      title: "Fictional new hazard",
      owner: person.email,
      initial: { severity: 4, likelihood: 3 },
      residual: { severity: 4, likelihood: 1 },
    }),
  ]);
  expect(writes[0]).not.toHaveProperty("id");
  expect(writes[0]).not.toHaveProperty("mitigations");
  expect(writes[0]).not.toHaveProperty("risk_level");
});

it("keeps a stale draft and its original precondition, with a separate-tab comparison link", async () => {
  const { actor, writes } = start({
    editing: true,
    write: () =>
      json({ detail: "This safety file changed after you opened it. Nothing was saved." }, 409),
  });
  const title = await screen.findByRole("textbox", { name: "Hazard title" });
  await actor.clear(title);
  await actor.type(title, "Unsaved stale judgement");
  await actor.click(screen.getByRole("button", { name: "Save hazard" }));
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Nothing was saved");
  expect(alert).toHaveFocus();
  expect(title).toHaveValue("Unsaved stale judgement");
  const compare = screen.getByRole("link", { name: /Open the latest recorded version/ });
  expect(compare).toHaveAttribute("href", "/safety-files/demo/hazards/HAZ-001");
  expect(compare).toHaveAttribute("target", "_blank");
  expect(writes[0]?.expected_head).toBe(head);
  await actor.click(screen.getByRole("button", { name: "Save hazard" }));
  await waitFor(() => expect(writes).toHaveLength(2));
  expect(writes[1]?.expected_head).toBe(head);
});

it("associates nested validation errors with the score and retains the draft", async () => {
  const { actor } = start({
    write: () => json({ initial: { severity: ["Select a severity score."] } }, 400),
  });
  const title = await screen.findByRole("textbox", { name: "Hazard title" });
  await actor.type(title, "Still here");
  await actor.click(screen.getByRole("button", { name: "Save hazard" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("combobox", { name: "Severity - initial" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(title).toHaveValue("Still here");
});

it("preserves both assessments and narrative on edit, and makes closure explicit", async () => {
  const { actor, writes } = start({
    editing: true,
    write: () => json({ detail: "A closed hazard requires a justification." }, 400),
  });
  await screen.findByRole("textbox", { name: "Hazard title" });
  expect(screen.getByRole("combobox", { name: "Likelihood - residual" })).toHaveValue("1");
  await actor.selectOptions(screen.getByRole("combobox", { name: "Hazard status" }), "closed");
  expect(screen.getByText(/Closing or transferring does not reduce risk/)).toBeInTheDocument();
  expect(
    screen.getByRole("textbox", { name: "Risk justification or closure reason" }),
  ).toBeRequired();
  await actor.click(screen.getByRole("button", { name: "Save hazard" }));
  expect(writes[0]).toEqual(
    expect.objectContaining({
      status: "closed",
      body: hazard.body,
      initial: { severity: 4, likelihood: 3 },
      residual: { severity: 4, likelihood: 1 },
    }),
  );
});

it("does not expose a save form for another owner's file", async () => {
  const { writes } = start({ canEdit: false });
  expect(await screen.findByText("Read-only safety file")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save hazard" })).not.toBeInTheDocument();
  expect(writes).toHaveLength(0);
});
