/**
 * MitigationDetail Component Tests
 */

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithMantine, renderWithRouter } from "@/test/test-utils";
import { FLAGGING_MITIGATION, SAMPLE_HAZARDS } from "@/test/safetyFile";

import MitigationDetail from "./MitigationDetail";

describe("MitigationDetail", () => {
  it("shows the status, control type and responsible person", () => {
    renderWithMantine(
      <MitigationDetail mitigation={FLAGGING_MITIGATION} hazards={SAMPLE_HAZARDS} />,
    );

    expect(
      screen.getByText(
        `Status: implemented. Control type: technical. Responsible person: ${FLAGGING_MITIGATION.owner}.`,
      ),
    ).toBeInTheDocument();
  });

  it("shows the recorded evidence", () => {
    renderWithMantine(
      <MitigationDetail mitigation={FLAGGING_MITIGATION} hazards={SAMPLE_HAZARDS} />,
    );

    expect(screen.getByText(FLAGGING_MITIGATION.evidence)).toBeInTheDocument();
  });

  it("says a proposed control without evidence is not evidence of risk reduction", () => {
    renderWithMantine(
      <MitigationDetail
        mitigation={{ ...FLAGGING_MITIGATION, status: "proposed", evidence: "" }}
        hazards={SAMPLE_HAZARDS}
      />,
    );

    expect(
      screen.getByText(/A proposed control is not evidence of risk reduction\./),
    ).toBeInTheDocument();
  });

  it("shows the narrative as the source that was saved, not rendered", () => {
    const body = "## Heading\n\n<!-- kept --> *as typed*";
    renderWithMantine(
      <MitigationDetail
        mitigation={{ ...FLAGGING_MITIGATION, body }}
        hazards={SAMPLE_HAZARDS}
      />,
    );

    const source = screen.getByText((_, element) => element?.tagName === "PRE");
    expect(source.textContent).toBe(body);
    expect(screen.queryByRole("heading", { name: "Heading" })).not.toBeInTheDocument();
  });

  it("links each linked hazard to its page", () => {
    renderWithRouter(
      <MitigationDetail
        mitigation={FLAGGING_MITIGATION}
        hazards={SAMPLE_HAZARDS}
        hazardHref={(id) => `/hazards/${id}`}
      />,
    );

    expect(screen.getByRole("link", { name: /^HAZ-001: / })).toHaveAttribute(
      "href",
      "/hazards/HAZ-001",
    );
  });

  it("says when a linked hazard's details were not supplied", () => {
    renderWithMantine(
      <MitigationDetail
        mitigation={{ ...FLAGGING_MITIGATION, hazards: ["HAZ-001", "HAZ-099"] }}
        hazards={SAMPLE_HAZARDS}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "HAZ-099 is recorded against this mitigation, but its details were not supplied.",
    );
  });

  it("says when nothing is linked", () => {
    renderWithMantine(
      <MitigationDetail
        mitigation={{ ...FLAGGING_MITIGATION, hazards: [] }}
        hazards={SAMPLE_HAZARDS}
      />,
    );

    expect(screen.getByText("No linked hazards recorded.")).toBeInTheDocument();
  });

  it("says links and status never change a risk assessment", () => {
    renderWithMantine(
      <MitigationDetail mitigation={FLAGGING_MITIGATION} hazards={SAMPLE_HAZARDS} />,
    );

    expect(
      screen.getByText(/never change a risk assessment automatically/),
    ).toBeInTheDocument();
  });

  it("can leave the title to the page header", () => {
    renderWithMantine(
      <MitigationDetail
        mitigation={FLAGGING_MITIGATION}
        hazards={SAMPLE_HAZARDS}
        showTitle={false}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: `MIT-001: ${FLAGGING_MITIGATION.title}` }),
    ).not.toBeInTheDocument();
  });
});
