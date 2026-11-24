/**
 * HazardDetail Component Tests
 */

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithMantine, renderWithRouter } from "@/test/test-utils";
import {
  BLOCKING_HAZARD,
  MITIGATED_HAZARD,
  SAMPLE_HAZARD_OPTIONS,
  SAMPLE_MITIGATIONS,
} from "@/test/safetyFile";

import HazardDetail from "./HazardDetail";

/** Reduced to an acceptable level. */
const REDUCED = MITIGATED_HAZARD;
/** Its residual level blocks go-live. */
const BLOCKING = BLOCKING_HAZARD;

describe("HazardDetail", () => {
  it("spells out both assessments, in the options' words, and the levels the server gave", () => {
    renderWithMantine(
      <HazardDetail
        hazard={REDUCED}
        mitigations={SAMPLE_MITIGATIONS}
        options={SAMPLE_HAZARD_OPTIONS}
      />,
    );
    // Severity is unchanged by mitigation, so it reads the same twice.
    expect(screen.getAllByText("Severity: 4 - Major")).toHaveLength(2);
    expect(screen.getByText("Likelihood: 3 - Medium")).toBeInTheDocument();
    expect(screen.getByText("Likelihood: 1 - Very low")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /^Risk level 4, Mandatory elimination/ }),
    ).toHaveTextContent(/^4\s*Mandatory elimination$/);
  });

  it("shows each score as its number without the options", () => {
    renderWithMantine(<HazardDetail hazard={REDUCED} mitigations={SAMPLE_MITIGATIONS} />);

    expect(screen.getAllByText("Severity: 4")).toHaveLength(2);
    expect(screen.getByText("Likelihood: 3")).toBeInTheDocument();
  });

  it("names the mitigations it relies on", () => {
    renderWithMantine(<HazardDetail hazard={REDUCED} mitigations={SAMPLE_MITIGATIONS} />);
    expect(screen.getByText(/MIT-001: Same-day automated flagging/)).toBeInTheDocument();
  });

  it("warns when the residual level blocks go-live", () => {
    renderWithMantine(<HazardDetail hazard={BLOCKING} mitigations={SAMPLE_MITIGATIONS} />);
    expect(screen.getByText("Residual risk requires elimination")).toBeInTheDocument();
    expect(
      screen.getByText(
        `The derived residual risk level is ${BLOCKING.residual.risk_level}. A closed or transferred status does not by itself reduce that assessment.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("No linked mitigations recorded.")).toBeInTheDocument();
  });

  it("does not warn for a hazard reduced to an acceptable level", () => {
    renderWithMantine(<HazardDetail hazard={REDUCED} mitigations={SAMPLE_MITIGATIONS} />);
    expect(screen.queryByText("Residual risk requires elimination")).not.toBeInTheDocument();
  });

  it("shows the recorded narrative as the Markdown source that was saved", () => {
    renderWithMantine(<HazardDetail hazard={REDUCED} mitigations={SAMPLE_MITIGATIONS} />);

    expect(screen.getByText("Recorded narrative (Markdown)")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Notes" })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "PRE" && element.textContent === REDUCED.body,
      ),
    ).toBeInTheDocument();
  });

  it("links each mitigation when told where its page is, and shows the action given", () => {
    renderWithRouter(
      <HazardDetail
        hazard={REDUCED}
        mitigations={SAMPLE_MITIGATIONS}
        mitigationHref={(id) => `/safety-files/demo/mitigations/${id}`}
        mitigationAction={<button type="button">Record a mitigation for this hazard</button>}
      />,
    );

    expect(
      screen.getByRole("link", { name: /MIT-001: Same-day automated flagging/ }),
    ).toHaveAttribute("href", "/safety-files/demo/mitigations/MIT-001");
    expect(
      screen.getByRole("button", { name: "Record a mitigation for this hazard" }),
    ).toBeInTheDocument();
  });

  it("leaves the title to the page header when asked", () => {
    renderWithMantine(
      <HazardDetail hazard={REDUCED} mitigations={SAMPLE_MITIGATIONS} showTitle={false} />,
    );

    expect(
      screen.queryByRole("heading", { name: `${REDUCED.id}: ${REDUCED.title}` }),
    ).not.toBeInTheDocument();
  });

  it("uses the page's words for the effect and the justification", () => {
    renderWithMantine(<HazardDetail hazard={REDUCED} mitigations={SAMPLE_MITIGATIONS} />);

    expect(screen.getByText("Effect on the care pathway")).toBeInTheDocument();
    expect(screen.getByText("Risk justification")).toBeInTheDocument();
  });
});
