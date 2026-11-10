import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, it, vi } from "vitest";

import { api, ApiError } from "../api/client";
import { HazardDetailPage } from "./HazardDetailPage";

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
  const spy = vi.spyOn(api, "get").mockResolvedValue({
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
    },
    mitigations: [
      {
        id: "MIT-001",
        title: "Daily review",
        evidence: "Pilot evidence",
        status: "implemented",
        control_type: "procedural",
      },
    ],
    problems: [],
    history: [],
    head_sha: "abc123",
  });
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
