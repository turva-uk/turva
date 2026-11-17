/**
 * A sample safety file, for the safety components' stories and tests.
 *
 * In the shape Turva's `/api/v1/safety-files/{slug}/` serves, with two
 * hazards from a fictional deployment of home blood pressure monitoring:
 * one reduced to an acceptable level, one whose residual level blocks
 * go-live. Not app data; nothing outside tests and stories imports it.
 *
 * Every risk level here is the one Turva's matrix in `safety_file/risk.py`
 * gives, from a copy kept for sample data and checked against the server's
 * by a Django test. The app itself never works a level out (TH-008).
 */

import type {
  Assessment,
  Commit,
  Hazard,
  HazardOptions,
  Mitigation,
  MitigationOptions,
  RiskScore,
  SafetyFile,
  SafetyFileDetail,
} from "@/lib/safety";

/**
 * Turva's risk matrix, copied for sample data only: rows are likelihood
 * 1 to 5, columns severity 1 to 5, as in `safety_file/risk.py`.
 * `app/config/tests/test_sample_risk_matrix.py` fails if the two ever
 * differ. The app never reads this; it asks the server.
 */
export const SAMPLE_RISK_MATRIX = [
  [1, 1, 2, 2, 3],
  [1, 2, 3, 3, 4],
  [2, 3, 3, 4, 5],
  [2, 3, 4, 4, 5],
  [3, 4, 4, 5, 5],
] as const;

/** The words for each level, as `RISK_LEVEL_LABELS` in `safety_file/risk.py`. */
export const SAMPLE_RISK_LABELS = {
  1: "Acceptable",
  2: "Acceptable if cost of reduction exceeds benefit",
  3: "Undesirable",
  4: "Mandatory elimination",
  5: "Unacceptable",
} as const;

/** An assessment as the server would send it, for sample data. */
export function assessment(severity: RiskScore, likelihood: RiskScore): Assessment {
  const level = SAMPLE_RISK_MATRIX[likelihood - 1]?.[severity - 1];

  if (level === undefined) {
    throw new Error(`Severity ${severity} and likelihood ${likelihood} are off the matrix.`);
  }

  return { severity, likelihood, risk_level: level, risk_label: SAMPLE_RISK_LABELS[level] };
}

export const SAMPLE_HEAD = "a".repeat(40);

/** Reduced by its mitigation to an acceptable level. */
export const MITIGATED_HAZARD: Hazard = {
  id: "HAZ-001",
  title: "Severe hypertension reading is not escalated",
  status: "open",
  owner: "cso@riverbank.example.nhs.uk",
  created: "2026-02-11",
  updated: "2026-03-04",
  cause: "Readings are reviewed in a weekly batch.",
  effect: "Delay to treatment the pathway requires within 24 hours.",
  harm: "Avoidable stroke or hypertensive emergency.",
  initial: assessment(4, 3),
  residual: assessment(4, 1),
  requires_elimination: false,
  justification: "Residual likelihood is reduced by same-day automated flagging.",
  mitigations: ["MIT-001"],
  body: "## Notes\n\nIdentified during the pathway walkthrough. Fictional sample only.",
};

/** Its residual level blocks go-live, with nothing yet against it. */
export const BLOCKING_HAZARD: Hazard = {
  id: "HAZ-002",
  title: "Reading attributed to the wrong patient",
  status: "open",
  owner: "it.lead@riverbank.example.nhs.uk",
  created: "2026-02-12",
  updated: "2026-02-12",
  cause: "Two patients share one monitor at home.",
  effect: "A reading is filed against the wrong record.",
  harm: "Treatment changed on another person's blood pressure.",
  initial: assessment(4, 3),
  residual: assessment(4, 3),
  requires_elimination: true,
  justification: "",
  mitigations: [],
  body: "",
};

/** Closed, with the justification a closed hazard needs. */
export const CLOSED_HAZARD: Hazard = {
  id: "HAZ-003",
  title: "Monitor cuff size is wrong for the patient",
  status: "closed",
  owner: "cso@riverbank.example.nhs.uk",
  created: "2026-02-14",
  updated: "2026-03-10",
  cause: "One cuff size is issued to everybody.",
  effect: "Readings are falsely high or low.",
  harm: "Treatment started or stopped on a wrong reading.",
  initial: assessment(3, 2),
  residual: assessment(1, 1),
  requires_elimination: false,
  justification: "Cuffs are now sized at issue and recorded in the kit log.",
  mitigations: [],
  body: "",
};

export const SAMPLE_HAZARDS: Hazard[] = [MITIGATED_HAZARD, BLOCKING_HAZARD, CLOSED_HAZARD];

export const SAMPLE_MITIGATIONS: Mitigation[] = [
  {
    id: "MIT-001",
    title: "Same-day automated flagging of readings above threshold",
    status: "implemented",
    owner: "it.lead@riverbank.example.nhs.uk",
    created: "2026-02-18",
    updated: "2026-03-02",
    control_type: "technical",
    hazards: ["HAZ-001"],
    evidence: "Verified against 412 readings in the March 2026 pilot.",
    body: "",
  },
];

export const SAMPLE_HISTORY: Commit[] = [
  {
    short_sha: "aaaaaaaa",
    subject: "Link MIT-001 to HAZ-001",
    author_name: "Sam Rivers",
    author_email: "it.lead@riverbank.example.nhs.uk",
    committed_at: "2026-03-02T09:00:00Z",
  },
];

export const SAMPLE_FILE: SafetyFile = {
  id: "0b9f4e2a-5c7d-4c1e-9a3f-2d8e6b1a4c70",
  slug: "bp-at-home",
  name: "BP@Home remote blood pressure monitoring",
  standard: "DCB0160",
  standard_display: "DCB0160 (deployment)",
  organisation: "Riverbank Health Federation",
  owner_name: "Dr Anita Patel",
  visibility: "private",
  url: "/safety-files/bp-at-home",
  exists_on_disk: true,
  created_at: "2026-02-10T09:00:00Z",
  updated_at: "2026-03-10T09:00:00Z",
};

export const SAMPLE_FILE_DETAIL: SafetyFileDetail = {
  safety_file: SAMPLE_FILE,
  can_edit: true,
  repository_missing: false,
  hazards: SAMPLE_HAZARDS,
  mitigations: SAMPLE_MITIGATIONS,
  blocking: ["HAZ-002"],
  history: SAMPLE_HISTORY,
  problems: [],
  head_sha: SAMPLE_HEAD,
};

/** Two files, as `GET safety-files/` lists them. */
export const SAMPLE_FILES: SafetyFile[] = [
  SAMPLE_FILE,
  {
    ...SAMPLE_FILE,
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
    slug: "digital-growth-charts",
    name: "Digital growth charts",
    visibility: "public",
    url: "/safety-files/digital-growth-charts",
    created_at: "2026-03-01T09:00:00Z",
    updated_at: "2026-03-01T09:00:00Z",
  },
];

/** What `hazard-options/` serves. */
export const SAMPLE_HAZARD_OPTIONS: HazardOptions = {
  severity: [
    { value: "1", label: "1 - Minor" },
    { value: "2", label: "2 - Significant" },
    { value: "3", label: "3 - Considerable" },
    { value: "4", label: "4 - Major" },
    { value: "5", label: "5 - Catastrophic" },
  ],
  likelihood: [
    { value: "1", label: "1 - Very low" },
    { value: "2", label: "2 - Low" },
    { value: "3", label: "3 - Medium" },
    { value: "4", label: "4 - High" },
    { value: "5", label: "5 - Very high" },
  ],
  statuses: ["open", "closed", "transferred"],
};

/** What `mitigation-options/` serves. */
export const SAMPLE_MITIGATION_OPTIONS: MitigationOptions = {
  statuses: ["proposed", "implemented", "verified", "withdrawn"],
  control_types: ["elimination", "technical", "warning", "procedural"],
};

/**
 * A stand-in for `previewAssessment`, for stories and tests: the level
 * the server would give, with no network.
 */
export function samplePreview(severity: RiskScore, likelihood: RiskScore): Promise<Assessment> {
  return Promise.resolve(assessment(severity, likelihood));
}
