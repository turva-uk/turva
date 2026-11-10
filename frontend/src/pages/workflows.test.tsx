import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App";
import type { User } from "../api/types";
import { SessionProvider } from "../auth/SessionProvider";
import { theme } from "../theme";

const person: User = {
  id: "demo-user",
  email: "a.patel@riverbank.example.nhs.uk",
  first_name: "Anita",
  last_name: "Patel",
  full_name: "Anita Patel",
  organisation: "Riverbank Health Federation",
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function start(path: string, mutate: (url: string, init: RequestInit) => Promise<Response>) {
  const fetcher = vi.fn(async (url: string, init: RequestInit = {}) => {
    if (init.method !== "GET") return mutate(url, init);
    if (url.endsWith("/auth/session/")) return json({ user: person, authenticated: true });
    if (url.endsWith("/profile/options/"))
      return json({
        regulators: [{ value: "GMC", label: "General Medical Council (GMC)" }],
        cso_criteria:
          "I hold current professional registration, have been trained in clinical risk management, am organisationally independent, and have authority to influence or halt deployment.",
      });
    if (url.endsWith("/safety-files/new-file/"))
      return json({
        safety_file: {
          name: "Demo deployment",
          standard_display: "DCB0160",
          organisation: person.organisation,
        },
        repository_missing: false,
        hazards: [],
        history: [],
      });
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <SessionProvider>
          <App />
        </SessionProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
  return { fetcher, actor: userEvent.setup() };
}

describe("profile editing", () => {
  it("shows the unverified warning and saves a full deliberate form", async () => {
    const writes: Record<string, unknown>[] = [];
    const { actor } = start("/profile", async (_, init) => {
      writes.push(JSON.parse(String(init.body)));
      return json(person);
    });
    const job = await screen.findByRole("textbox", { name: "Job role" });
    expect(screen.getByText(/Not verified by Turva/)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "I meet the criteria for a Clinical Safety Officer",
      }),
    ).toBeChecked();
    await actor.clear(job);
    await actor.type(job, "Lead CSO");
    expect(writes).toHaveLength(0);
    await actor.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByRole("status");
    expect(writes).toEqual([
      expect.objectContaining({
        job_role: "Lead CSO",
        is_cso: true,
        confirm_cso_criteria: true,
      }),
    ]);
  });

  it("keeps the draft and associates server errors with the field", async () => {
    const { actor } = start("/profile", async () =>
      json({ registration_number: ["That registration cannot be recorded."] }, 400),
    );
    const number = await screen.findByRole("textbox", { name: "Registration number" });
    await actor.clear(number);
    await actor.type(number, "new-number");
    await actor.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByRole("alert");
    expect(number).toHaveValue("new-number");
    expect(number).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("safety file creation", () => {
  it("prefills the organisation, waits for a successful save, then opens the file", async () => {
    const writes: Record<string, unknown>[] = [];
    const { actor } = start("/safety-files/new", async (_, init) => {
      writes.push(JSON.parse(String(init.body)));
      return json({ slug: "new-file" }, 201);
    });
    await screen.findByRole("textbox", { name: "System name" });
    expect(screen.getByRole("textbox", { name: "Organisation" })).toHaveValue(
      person.organisation,
    );
    await actor.type(screen.getByRole("textbox", { name: "System name" }), "Demo deployment");
    await actor.type(
      screen.getByRole("textbox", { name: "Intended use" }),
      "Fictional remote monitoring.",
    );
    await actor.click(screen.getByRole("button", { name: "Create safety file" }));
    await screen.findByRole("heading", { name: "Demo deployment" });
    expect(writes).toEqual([
      {
        name: "Demo deployment",
        standard: "DCB0160",
        organisation: person.organisation,
        intended_use: "Fictional remote monitoring.",
      },
    ]);
    expect(screen.getByText(/An empty hazard log is not evidence/)).toBeInTheDocument();
  });

  it("retains entries after a storage failure and allows retry", async () => {
    let attempts = 0;
    const { actor } = start("/safety-files/new", async () => {
      attempts++;
      return json({ detail: "Storage is unavailable. Try again." }, 503);
    });
    const name = await screen.findByRole("textbox", { name: "System name" });
    await actor.type(name, "My draft");
    await actor.click(screen.getByRole("button", { name: "Create safety file" }));
    await screen.findByRole("alert");
    expect(name).toHaveValue("My draft");
    await actor.click(screen.getByRole("button", { name: "Create safety file" }));
    await waitFor(() => expect(attempts).toBe(2));
  });

  it("warns that the manufacture template is not implemented", async () => {
    const { actor } = start("/safety-files/new", async () => json({}));
    await actor.selectOptions(
      await screen.findByRole("combobox", { name: "Standard" }),
      "DCB0129",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("This is not a DCB0129 document set");
  });
});
