import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";

import type { Hazard } from "../api/types";
import { HazardLog } from "./HazardLog";

const hazards: Hazard[] = [
  {
    id: "HAZ-001",
    title: "Reading not escalated",
    status: "open",
    owner: "cso@example.org",
    cause: "Batch review",
    effect: "Delayed treatment",
    harm: "Avoidable stroke",
    initial: { severity: 4, likelihood: 3, risk_level: 4, risk_label: "Mandatory elimination" },
    residual: {
      severity: 4,
      likelihood: 1,
      risk_level: 2,
      risk_label: "Acceptable if cost of reduction exceeds benefit",
    },
    body: "",
    created: "2026-11-10",
    updated: "2026-11-10",
    justification: "Daily review",
    mitigations: [],
    requires_elimination: false,
  },
];

function show(data = hazards) {
  render(
    <MantineProvider>
      <MemoryRouter>
        <HazardLog hazards={data} slug="demo" />
      </MemoryRouter>
    </MantineProvider>,
  );
}

it("links to the hazard and always labels both risk assessments", () => {
  show();
  expect(screen.getByRole("link", { name: "Reading not escalated" })).toHaveAttribute(
    "href",
    "/safety-files/demo/hazards/HAZ-001",
  );
  const residual = screen.getByLabelText(/^residual severity 4, likelihood 1, risk level 2,/);
  expect(residual.closest("td")).toHaveAttribute("data-label", "Residual risk");
  expect(residual).toHaveTextContent("Acceptable if cost of reduction exceeds benefit");
});

it("searches cause and harm and distinguishes no matches from an empty log", async () => {
  show();
  const actor = userEvent.setup();
  const search = screen.getByRole("textbox", { name: "Find a hazard" });
  await actor.type(search, "stroke");
  expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 1");
  await actor.selectOptions(screen.getByRole("combobox", { name: "Hazard status" }), "closed");
  expect(screen.getByText(/No hazards match/)).toBeInTheDocument();
  expect(screen.queryByText(/An empty hazard log is not evidence/)).not.toBeInTheDocument();
});

it("does not describe an empty log as safe", () => {
  show([]);
  expect(
    screen.getByText(/An empty hazard log is not evidence of a safe system/),
  ).toBeInTheDocument();
});
