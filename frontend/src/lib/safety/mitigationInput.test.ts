import { describe, expect, it } from "vitest";

import type { Mitigation } from "@/api/types";

import {
  blankMitigation,
  completeMitigation,
  mitigationInputFrom,
  mitigationProblems,
} from "./mitigationInput";
import { isControlType, isMitigationStatus } from "./types";

const MITIGATION: Mitigation = {
  id: "MIT-001",
  title: "Allergy panel loads before the prescribing screen",
  status: "implemented",
  owner: "it.lead@example.nhs.uk",
  created: "2026-11-01",
  updated: "2026-11-02",
  control_type: "technical",
  evidence: "Fictional test only.",
  hazards: ["HAZ-001"],
  body: "Fictional narrative.",
};

describe("blankMitigation", () => {
  it("starts proposed, with no control type assumed", () => {
    const blank = blankMitigation("cso@example.nhs.uk", ["HAZ-002"]);

    expect(blank.status).toBe("proposed");
    expect(blank.control_type).toBeNull();
    expect(blank.owner).toBe("cso@example.nhs.uk");
    expect(blank.hazards).toEqual(["HAZ-002"]);
  });
});

describe("mitigationInputFrom", () => {
  it("keeps the write fields and leaves the record's own fields behind", () => {
    const draft = mitigationInputFrom(MITIGATION);

    expect(draft).toEqual({
      title: MITIGATION.title,
      status: "implemented",
      owner: MITIGATION.owner,
      control_type: "technical",
      hazards: ["HAZ-001"],
      evidence: MITIGATION.evidence,
      body: MITIGATION.body,
    });
    expect(draft).not.toHaveProperty("id");
    expect(draft).not.toHaveProperty("created");
  });

  it("does not share the record's hazard list", () => {
    const draft = mitigationInputFrom(MITIGATION);
    draft.hazards.push("HAZ-009");

    expect(MITIGATION.hazards).toEqual(["HAZ-001"]);
  });

  it("leaves an unrecorded control type unchosen rather than assuming one", () => {
    expect(mitigationInputFrom({ ...MITIGATION, control_type: "" }).control_type).toBeNull();
  });

  it("refuses a status Turva does not know, rather than replacing it", () => {
    expect(() => mitigationInputFrom({ ...MITIGATION, status: "under review" })).toThrow(
      /status Turva does not know: under review/,
    );
  });

  it("refuses a control type Turva does not know, rather than replacing it", () => {
    expect(() => mitigationInputFrom({ ...MITIGATION, control_type: "training" })).toThrow(
      /control type Turva does not know: training/,
    );
  });
});

describe("mitigationProblems", () => {
  it("names each missing required field", () => {
    expect(mitigationProblems(blankMitigation())).toEqual([
      "Give the mitigation a title.",
      "Give the email address of the responsible person.",
      "Choose a control type.",
    ]);
  });

  it.each(["implemented", "verified"] as const)("requires evidence once %s", (status) => {
    const draft = { ...mitigationInputFrom(MITIGATION), status, evidence: " " };

    expect(mitigationProblems(draft)).toEqual([
      `A mitigation marked ${status} needs implementation and verification evidence.`,
    ]);
  });

  it.each(["proposed", "withdrawn"] as const)("does not require evidence when %s", (status) => {
    const draft = { ...mitigationInputFrom(MITIGATION), status, evidence: "" };

    expect(mitigationProblems(draft)).toEqual([]);
  });
});

describe("completeMitigation", () => {
  it("hands back the input once nothing stops it", () => {
    expect(completeMitigation(mitigationInputFrom(MITIGATION))).toMatchObject({
      control_type: "technical",
    });
  });

  it("hands back nothing while something is missing", () => {
    expect(completeMitigation(blankMitigation("cso@example.nhs.uk"))).toBeNull();
  });
});

describe("the narrowers", () => {
  it("accept only Turva's statuses and control types", () => {
    expect(["proposed", "implemented", "verified", "withdrawn"].every(isMitigationStatus)).toBe(
      true,
    );
    expect(isMitigationStatus("closed")).toBe(false);
    expect(["elimination", "technical", "warning", "procedural"].every(isControlType)).toBe(
      true,
    );
    expect(isControlType("")).toBe(false);
  });
});
