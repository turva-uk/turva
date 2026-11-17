/**
 * HazardDetail Component Tests
 */

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithMantine } from "@/test/test-utils";
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
    expect(screen.getByText("This hazard blocks go-live")).toBeInTheDocument();
    expect(screen.getByText("No mitigation is recorded against it.")).toBeInTheDocument();
  });

  it("does not warn for a hazard reduced to an acceptable level", () => {
    renderWithMantine(<HazardDetail hazard={REDUCED} mitigations={SAMPLE_MITIGATIONS} />);
    expect(screen.queryByText("This hazard blocks go-live")).not.toBeInTheDocument();
  });

  it("renders the notes as Markdown", () => {
    renderWithMantine(<HazardDetail hazard={REDUCED} mitigations={SAMPLE_MITIGATIONS} />);
    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument();
  });
});
