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
  Assignment,
  Member,
  MyAssignment,
  Post,
  SafetyFileExtras,
  Commit,
  DocumentRef,
  Extraction,
  SafetyDocumentContent,
  SafetyDocumentSummary,
  Hazard,
  HazardOptions,
  Mitigation,
  MitigationOptions,
  RiskScore,
  SafetyFile,
  SafetyFileDetail,
  SafetyProcess,
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

/* ------------------------------------------------------------------ */
/*  Not yet in Turva's API                                             */
/* ------------------------------------------------------------------ */

/** The prose documents a DCB0160 file holds. Not yet in Turva's API. */
export const SAMPLE_DOCUMENTS: DocumentRef[] = [
  { path: "docs/index.md", title: "BP@Home remote blood pressure monitoring" },
  { path: "docs/clinical-risk-management-plan.md", title: "Clinical Risk Management Plan" },
  { path: "docs/clinical-safety-case-report.md", title: "Clinical Safety Case Report" },
];

/**
 * A supplier's table as an extraction would read it: one hazard and a
 * note. Not yet in Turva's API. No row carries a risk level: the review
 * asks the server for it.
 */
export const SAMPLE_EXTRACTION: Extraction = {
  source: "growth-charts.docx",
  headers: ["Hazard number", "Hazard name", "Cause", "Severity", "Likelihood"],
  column_map: {
    supplier_id: 0,
    title: 1,
    cause: 2,
    effect: null,
    harm: null,
    controls: null,
    severity: 3,
    likelihood: 4,
  },
  rows: [
    {
      row: 1,
      cells: [
        "dGC-49",
        "The API returns an incorrect centile",
        "A fault in the calculation library.",
        "Major",
        "Very low",
      ],
      supplier_id: "dGC-49",
      title: "The API returns an incorrect centile",
      cause: "A fault in the calculation library.",
      effect: "",
      harm: "",
      controls: "",
      severity: 4,
      likelihood: 1,
      problems: [],
    },
    {
      row: 2,
      cells: ["Note", "Rows below are still being triaged.", "", "", ""],
      supplier_id: "Note",
      title: "Rows below are still being triaged.",
      cause: "",
      effect: "",
      harm: "",
      controls: "",
      severity: null,
      likelihood: null,
      problems: ["no severity", "no likelihood"],
    },
  ],
};

/** A process part-way through: the supplier onboarded, no workshop yet. Not yet in Turva's API. */
export const SAMPLE_PROCESS: SafetyProcess = {
  next_step: "hold-a-hazard-workshop",
  steps: [
    {
      id: "describe-the-system",
      title: "Describe the system and its intended use",
      guide: "docs/guide/describe-the-system.md",
      cites: ["4.2.1", "4.2.2", "4.2.3"],
      done: true,
      reasons: [],
    },
    {
      id: "onboard-the-supplier",
      title: "Onboard the supplier's safety case",
      guide: "docs/guide/onboard-the-supplier.md",
      cites: ["2.5.1"],
      done: true,
      reasons: [],
    },
    {
      id: "hold-a-hazard-workshop",
      title: "Hold a hazard workshop",
      guide: "docs/guide/hold-a-hazard-workshop.md",
      cites: ["4.1.2", "4.3.1"],
      done: false,
      reasons: ["no hazard workshop has been recorded"],
    },
    {
      id: "approve-the-safety-case",
      title: "The Clinical Safety Officer approves the safety case",
      guide: "docs/guide/approve-the-safety-case.md",
      cites: ["3.3.2", "3.5.2"],
      done: false,
      reasons: ["the safety case is not yet approved"],
    },
  ],
};

/** The safety posts in the file's organisation. Not yet in Turva's API. */
export const SAMPLE_POSTS: Post[] = [
  {
    kind: "clinical_safety_officer",
    title: "Clinical Safety Officer",
    holder_id: "5f1c2a9e-0b7d-4e3a-9c61-2d8f4b7a1e30",
    holder_name: "Dr Anita Patel",
    registrations: ["GMC 7654321"],
    registration_verified: false,
  },
  {
    kind: "top_management",
    title: "Top Management",
    holder_id: null,
    holder_name: null,
    registrations: [],
    registration_verified: false,
  },
];

/** The officer, who assigns mitigations. Not yet in Turva's API. */
export const SAMPLE_CSO: Member = {
  id: "5f1c2a9e-0b7d-4e3a-9c61-2d8f4b7a1e30",
  name: "Dr Anita Patel",
};

/** The IT lead, who evidences one. Not yet in Turva's API. */
export const SAMPLE_IT_LEAD: Member = {
  id: "9a4e7c21-3f6b-4d8e-b2a0-7c5d1e9f3b46",
  name: "Sam Rivers",
};

export const SAMPLE_MEMBERS: Member[] = [SAMPLE_CSO, SAMPLE_IT_LEAD];

/** The first sample mitigation, named so stories need no index. */
export const FLAGGING_MITIGATION: Mitigation = SAMPLE_MITIGATIONS[0] ?? {
  id: "MIT-001",
  title: "Same-day automated flagging of readings above threshold",
  status: "implemented",
  owner: "it.lead@riverbank.example.nhs.uk",
  created: "2026-02-18",
  updated: "2026-03-02",
  control_type: "technical",
  hazards: ["HAZ-001"],
  evidence: "",
  body: "",
};

/** MIT-001 asked of the IT lead. Not yet in Turva's API. */
export const SAMPLE_ASSIGNMENTS: Assignment[] = [
  {
    id: "c3b8e1f2-6a4d-4b9e-8f17-2e5a9d0c4b71",
    mitigation_id: FLAGGING_MITIGATION.id,
    mitigation_title: FLAGGING_MITIGATION.title,
    assignee_id: SAMPLE_IT_LEAD.id,
    assignee_name: SAMPLE_IT_LEAD.name,
    assigned_by_name: SAMPLE_CSO.name,
    assigned_at: "2026-11-07T09:00:00Z",
  },
];

/** The same assignment, as the IT lead sees it. Not yet in Turva's API. */
export const SAMPLE_MY_ASSIGNMENT: MyAssignment = {
  id: "c3b8e1f2-6a4d-4b9e-8f17-2e5a9d0c4b71",
  slug: SAMPLE_FILE.slug,
  file_name: SAMPLE_FILE.name,
  organisation: SAMPLE_FILE.organisation,
  assigned_by_name: SAMPLE_CSO.name,
  assigned_at: "2026-11-07T09:00:00Z",
  mitigation: { ...FLAGGING_MITIGATION, status: "proposed", evidence: "" },
  head_sha: SAMPLE_HEAD,
};

/** What the sign-off, process and assignment components read about the file. Not yet in Turva's API. */
export const SAMPLE_EXTRAS: SafetyFileExtras = {
  safety_file: SAMPLE_FILE,
  status: "draft",
  documents: SAMPLE_DOCUMENTS,
  posts: SAMPLE_POSTS,
  process: SAMPLE_PROCESS,
  sign_offs: null,
  assignments: SAMPLE_ASSIGNMENTS,
  members: SAMPLE_MEMBERS,
};

/** The same, as its officer sees it, able to approve. Not yet in Turva's API. */
export const SAMPLE_EXTRAS_FOR_CSO: SafetyFileExtras = {
  ...SAMPLE_EXTRAS,
  sign_offs: {
    can_approve: true,
    can_accept: false,
    two_factor_enabled: true,
    tags: [],
  },
};

/* ------------------------------------------------------------------ */
/*  A document, as the document route sends it                         */
/* ------------------------------------------------------------------ */

/** The documents a file holds, as the document route lists them. */
export const SAMPLE_DOCUMENT_LIST: SafetyDocumentSummary[] = [
  { key: "index", title: "Overview" },
  { key: "safety-case", title: "Clinical safety case report" },
  { key: "hazard-log", title: "Hazard log" },
];

/**
 * One document's typed nodes, with one of each kind the renderer shows:
 * headings, a table with a mailto link, an admonition, a link to another
 * document, a reference, an image the server left out, and text that
 * looks like HTML, which must show as text.
 */
export const SAMPLE_DOCUMENT: SafetyDocumentContent = {
  key: "safety-case",
  title: "Clinical safety case report",
  path: "docs/safety-case.md",
  source_commit: SAMPLE_HEAD,
  available: true,
  unsupported: 1,
  blocks: [
    {
      type: "element",
      tag: "h2",
      attrs: { id: "system" },
      children: [{ type: "text", text: "1. System" }],
    },
    {
      type: "element",
      tag: "p",
      children: [
        { type: "element", tag: "strong", children: [{ type: "text", text: "BP@Home" }] },
        { type: "text", text: " remote blood pressure monitoring. See the " },
        {
          type: "document",
          document: "hazard-log",
          fragment: "open-hazards",
          children: [{ type: "text", text: "hazard log" }],
        },
        { type: "text", text: "." },
        { type: "reference", text: "DCB0160 2.3" },
      ],
    },
    {
      type: "element",
      tag: "h2",
      attrs: { id: "officer" },
      children: [{ type: "text", text: "2. Clinical Safety Officer" }],
    },
    {
      type: "element",
      tag: "table",
      children: [
        {
          type: "element",
          tag: "tbody",
          children: [
            {
              type: "element",
              tag: "tr",
              children: [
                { type: "element", tag: "td", children: [{ type: "text", text: "Name" }] },
                {
                  type: "element",
                  tag: "td",
                  children: [{ type: "text", text: "Dr Anita Patel" }],
                },
              ],
            },
            {
              type: "element",
              tag: "tr",
              children: [
                { type: "element", tag: "td", children: [{ type: "text", text: "Contact" }] },
                {
                  type: "element",
                  tag: "td",
                  children: [
                    {
                      type: "external",
                      href: "mailto:a.patel@riverbank.example.nhs.uk",
                      children: [{ type: "text", text: "a.patel@riverbank.example.nhs.uk" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "admonition",
      kind: "warning",
      title: "Residual risk",
      collapsible: false,
      children: [
        {
          type: "element",
          tag: "p",
          children: [
            { type: "text", text: "Two hazards remain at a derived residual risk level of 3." },
          ],
        },
      ],
    },
    { type: "unsupported", description: "an image (Pathway diagram)." },
    {
      type: "element",
      tag: "p",
      children: [{ type: "text", text: '<img src=x onerror="alert(1)"> stays text.' }],
    },
  ],
};
