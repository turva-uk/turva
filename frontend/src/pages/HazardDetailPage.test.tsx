import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, it, vi } from "vitest";

import { api, ApiError } from "../api/client";
import { HazardDetailPage } from "./HazardDetailPage";

/** A hazard as the API sends it, with `overrides` on top. */
function detail(overrides: Record<string, unknown> = {}) {
  return {
    ...{
      safety_file: { name: "Demo" },
      hazard: {
        id: "HAZ-001",
        title: "Delayed escalation",
        status: "open",
        owner: "cso@example.org",
        initial: {
          severity: 4,
          likelihood: 3,
          risk_level: 4,
          risk_label: "Mandatory elimination",
        },
        residual: {
          severity: 4,
          likelihood: 1,
          risk_level: 2,
          risk_label: "Acceptable if cost of reduction exceeds benefit",
        },
        cause: "Batch review",
        effect: "Delayed treatment",
        harm: "Avoidable stroke",
        justification: "Daily review",
        body: '<script>alert("untrusted evidence")</script>',
        // The hazard names the mitigations it relies on, as the API sends.
        mitigations: ["MIT-001"],
      },
      mitigations: [
        {
          id: "MIT-001",
          title: "Daily review",
          evidence: "Pilot evidence",
          status: "implemented",
          control_type: "procedural",
          owner: "cso@example.org",
          body: "",
        },
      ],
      problems: [],
      history: [],
      head_sha: "abc123",
    },
    ...overrides,
  };
}

function show() {
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={["/safety-files/demo/hazards/HAZ-001"]}>
        <Routes>
          <Route path="/safety-files/:slug/hazards/:hazardId" element={<HazardDetailPage />} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

it("shows cause, harm and linked evidence as text, never executable HTML", async () => {
  const spy = vi.spyOn(api, "get").mockResolvedValue(detail());
  try {
    show();
    await screen.findByRole("heading", { name: "HAZ-001: Delayed escalation" });
    expect(screen.getByText("Avoidable stroke")).toBeInTheDocument();
    expect(screen.getByText("Pilot evidence")).toBeInTheDocument();
    expect(screen.getByText(/<script>alert/)).toBeInTheDocument();
    expect(document.querySelector("main script, pre script")).toBeNull();
  } finally {
    spy.mockRestore();
  }
});

it("reports unavailable evidence rather than an empty hazard", async () => {
  const spy = vi
    .spyOn(api, "get")
    .mockRejectedValue(new ApiError(503, "The repository cannot be read."));
  try {
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The repository cannot be read.",
    );
    expect(screen.queryByText("No linked mitigations recorded.")).not.toBeInTheDocument();
  } finally {
    spy.mockRestore();
  }
});

it("offers to edit the hazard and record a mitigation only to somebody who may edit", async () => {
  const spy = vi.spyOn(api, "get").mockResolvedValue(
    detail({
      can_edit: true,
      history: [
        {
          short_sha: "abc1234",
          subject: "feat(HAZ-001): identify hazard",
          author_name: "Dr Anita Patel",
          author_email: "a.patel@example.org",
          committed_at: "2026-11-20T10:00:00Z",
        },
      ],
    }),
  );
  try {
    show();
    await screen.findByRole("heading", { name: "HAZ-001: Delayed escalation" });

    expect(screen.getByRole("button", { name: "Edit hazard" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Record a mitigation for this hazard" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", {
        name: "Hazard history",
      }),
    ).toBeInTheDocument();
  } finally {
    spy.mockRestore();
  }
});
