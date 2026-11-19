import { describe, expect, it } from "vitest";

import type { Hazard } from "@/api/types";

import { blankHazard, hazardInputFrom, hazardProblems } from "./hazardInput";
import { isRiskScore, RISK_SCORES } from "./risk";

const HAZARD: Hazard = {
  id: "HAZ-001",
  title: "Allergy not shown on the prescribing screen",
  status: "open",
  owner: "cso@example.nhs.uk",
  created: "2026-11-01",
  updated: "2026-11-02",
  initial: { severity: 4, likelihood: 3, risk_level: 4, risk_label: "Mandatory elimination" },
  residual: { severity: 3, likelihood: 2, risk_level: 3, risk_label: "Undesirable" },
  cause: "The allergy panel loads after the screen.",
  effect: "A prescriber does not see the allergy.",
  harm: "An allergic reaction.",
  justification: "",
  mitigations: ["MIT-001"],
  requires_elimination: true,
  body: "Fictional test only.",
};

describe("blankHazard", () => {
  it("starts open, mid-matrix, with the owner given", () => {
    const blank = blankHazard("cso@example.nhs.uk");

    expect(blank.status).toBe("open");
    expect(blank.owner).toBe("cso@example.nhs.uk");
    expect(blank.initial).toEqual({ severity: 3, likelihood: 3 });
    expect(blank.residual).toEqual({ severity: 3, likelihood: 3 });
  });

  it("has nothing to say about risk level", () => {
    expect(JSON.stringify(blankHazard())).not.toMatch(/risk_/);
  });
});

describe("hazardInputFrom", () => {
  it("keeps the hazard's words, owner and scores", () => {
    const input = hazardInputFrom(HAZARD);

    expect(input).toMatchObject({
      title: HAZARD.title,
      owner: HAZARD.owner,
      cause: HAZARD.cause,
      effect: HAZARD.effect,
      harm: HAZARD.harm,
      body: HAZARD.body,
      initial: { severity: 4, likelihood: 3 },
      residual: { severity: 3, likelihood: 2 },
    });
  });

  it("drops the risk level and label the hazard carries", () => {
    const input = hazardInputFrom(HAZARD);

    expect(input.initial).toEqual({ severity: 4, likelihood: 3 });
    expect(input.residual).toEqual({ severity: 3, likelihood: 2 });
    expect(JSON.stringify(input)).not.toMatch(/risk_level|risk_label/);
  });

  it("leaves out the fields Turva's API will not take on a write", () => {
    const input = hazardInputFrom(HAZARD);

    // The server refuses unknown fields. These are read-only there.
    for (const field of ["id", "created", "updated", "mitigations", "requires_elimination"]) {
      expect(input).not.toHaveProperty(field);
    }
  });

  it("refuses a status Turva does not know, rather than sending another", () => {
    expect(() => hazardInputFrom({ ...HAZARD, status: "pending" })).toThrow(/status/);
  });

  it("refuses a score off the matrix", () => {
    const off = { ...HAZARD.initial, severity: 6 };

    expect(() => hazardInputFrom({ ...HAZARD, initial: off })).toThrow(/initial/);
  });
});

describe("hazardProblems", () => {
  const valid = hazardInputFrom(HAZARD);

  it("finds nothing wrong with a valid hazard", () => {
    expect(hazardProblems(valid)).toEqual([]);
  });

  it("asks for a title", () => {
    expect(hazardProblems({ ...valid, title: "  " })).toEqual(["Give the hazard a title."]);
  });

  it("refuses a residual severity above the initial one (layout rule 6)", () => {
    const problems = hazardProblems({ ...valid, residual: { severity: 5, likelihood: 2 } });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/Residual severity/);
  });

  it("refuses a residual likelihood above the initial one (layout rule 6)", () => {
    const problems = hazardProblems({ ...valid, residual: { severity: 3, likelihood: 4 } });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/Residual likelihood/);
  });

  it("asks a closed hazard for a justification (layout rule 7)", () => {
    const problems = hazardProblems({ ...valid, status: "closed", justification: "" });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/justification/);
    expect(hazardProblems({ ...valid, status: "closed", justification: "Removed." })).toEqual(
      [],
    );
  });
});

describe("RISK_SCORES", () => {
  it("is the five scores of the matrix, and nothing else is one", () => {
    expect(RISK_SCORES).toEqual([1, 2, 3, 4, 5]);
    expect([0, 1, 5, 6, 2.5].map(isRiskScore)).toEqual([false, true, true, false, false]);
  });
});
