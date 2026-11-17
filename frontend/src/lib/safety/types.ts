/**
 * Safety file types for the safety components.
 *
 * What Turva's API serves is defined once, in `@/api/types`, and only
 * re-exported here, so a component and a page can never disagree about
 * a field. A risk level only ever arrives, derived by the server from
 * severity and likelihood; no type a request sends carries one (TH-008).
 *
 * Below the re-exports are the types for features Turva's API does not
 * have yet: documents, supplier extraction, the process, sign-off,
 * assignments and workshops. The components ported from Quill show
 * these, and their stories say so. Each is written in Turva's naming
 * (`slug`, `head_sha`, `organisation`) and may change when its route is
 * written.
 */

import type { Assessment, Hazard, Mitigation, SafetyFile } from "@/api/types";

export type {
  Assessment,
  Commit,
  Hazard,
  HazardDetail,
  HazardOptions,
  Mitigation,
  MitigationDetail,
  MitigationOptions,
  SafetyFile,
  SafetyFileDetail,
} from "@/api/types";

/* ------------------------------------------------------------------ */
/*  The values Turva's API accepts                                     */
/* ------------------------------------------------------------------ */

/**
 * A severity or likelihood on the 5 by 5 matrix. `hazard-options/`
 * serves the same five, with their labels.
 */
export type RiskScore = 1 | 2 | 3 | 4 | 5;

/** Where a hazard stands, as `hazard-options/` serves it. Never deleted, only closed. */
export type HazardStatus = "open" | "closed" | "transferred";

/** Where a mitigation stands, as `mitigation-options/` serves it. */
export type MitigationStatus = "proposed" | "implemented" | "verified" | "withdrawn";

/** The hierarchy of controls, strongest first, as `mitigation-options/` serves it. */
export type ControlType = "elimination" | "technical" | "warning" | "procedural";

/** Narrows a status Turva's API sends as a string. */
export function isHazardStatus(value: string): value is HazardStatus {
  return value === "open" || value === "closed" || value === "transferred";
}

/* ------------------------------------------------------------------ */
/*  What a request sends                                               */
/* ------------------------------------------------------------------ */

/** A new safety file, as `POST safety-files/` takes it. */
export interface SafetyFileInput {
  name: string;
  standard: "DCB0129" | "DCB0160";
  organisation: string;
  intended_use: string;
}

/** A severity and likelihood. Never a risk level: the server derives it. */
export interface AssessmentInput {
  severity: RiskScore;
  likelihood: RiskScore;
}

/**
 * A hazard as a form edits it. There is no risk level here, and no way
 * to add one: `initial` and `residual` are `AssessmentInput`s.
 */
export interface HazardInput {
  title: string;
  status: HazardStatus;
  owner: string;
  cause: string;
  effect: string;
  harm: string;
  initial: AssessmentInput;
  residual: AssessmentInput;
  justification: string;
  body: string;
}

/** A mitigation as a form edits it. */
export interface MitigationInput {
  title: string;
  status: MitigationStatus;
  owner: string;
  control_type: ControlType;
  hazards: string[];
  evidence: string;
  body: string;
}

/** What a hazard write hands back: the hazard, and the version it made. */
export interface HazardWrite {
  hazard: Hazard;
  head_sha: string;
}

/** What a mitigation write hands back. */
export interface MitigationWrite {
  mitigation: Mitigation;
  head_sha: string;
}

/* ------------------------------------------------------------------ */
/*  Not yet in Turva's API                                             */
/* ------------------------------------------------------------------ */

/** Where a file stands, read from its sign-off tags. Not yet in Turva's API. */
export type SafetyFileStatus = "draft" | "approved" | "accepted";

/** One prose document the file holds. Not yet in Turva's API. */
export interface DocumentRef {
  path: string;
  title: string;
}

/** One prose document and the version it was read at. Not yet in Turva's API. */
export interface SafetyDocument {
  path: string;
  text: string;
  head_sha: string | null;
}

/** Where an extracted hazard came from. Not yet in Turva's API. */
export interface HazardSource {
  document: string;
  row: string;
  supplier_id: string | null;
}

/** A supplier's document kept in the file. Not yet in Turva's API. */
export interface SafetySource {
  name: string;
  path: string;
}

/** The fields a column of a supplier's table can feed. Not yet in Turva's API. */
export const EXTRACTION_FIELDS = [
  "supplier_id",
  "title",
  "cause",
  "effect",
  "harm",
  "controls",
  "severity",
  "likelihood",
] as const;

export type ExtractionField = (typeof EXTRACTION_FIELDS)[number];

/** Which column, from 0, feeds which field; null for none. Not yet in Turva's API. */
export type ColumnMap = Record<ExtractionField, number | null>;

/**
 * One row of a supplier's table, and the hazard it would become. Not
 * yet in Turva's API. Its assessment, when it has one, is the server's,
 * so the level is derived there as everywhere else.
 */
export interface ExtractionRow {
  row: number;
  cells: string[];
  supplier_id: string;
  title: string;
  cause: string;
  effect: string;
  harm: string;
  controls: string;
  severity: number | null;
  likelihood: number | null;
  /** Why it cannot be imported as it stands; empty if it can. */
  problems: string[];
}

/** A supplier's table, as read under a column map. Not yet in Turva's API. */
export interface Extraction {
  source: string;
  headers: string[];
  column_map: ColumnMap;
  rows: ExtractionRow[];
}

/** A safety post in the file's organisation, and who holds it. Not yet in Turva's API. */
export interface Post {
  kind: string;
  title: string;
  holder_id: string | null;
  holder_name: string | null;
  registrations: string[];
  /** Always false: Turva checks no professional register. */
  registration_verified: boolean;
}

/** One step of the template's process, worked out from the file. Not yet in Turva's API. */
export interface ProcessStep {
  id: string;
  title: string;
  /** The guide page in the file, such as `docs/guide/control-the-risks.md` */
  guide: string;
  /** The requirements the guide page quotes */
  cites: string[];
  done: boolean;
  /** What is still outstanding, in words; empty when done */
  reasons: string[];
}

/** Where the file stands in its template's process. Not yet in Turva's API. */
export interface SafetyProcess {
  steps: ProcessStep[];
  /** The first step not done, or null when every step is */
  next_step: string | null;
}

/** Who may sign the file now. Not yet in Turva's API, which would check it all again. */
export interface SignOffs {
  can_approve: boolean;
  can_accept: boolean;
  two_factor_enabled: boolean;
  /** Every sign-off tag, such as `approved/2026-11-07` */
  tags: string[];
}

/** One mitigation out with somebody, for the officer's view. Not yet in Turva's API. */
export interface Assignment {
  id: string;
  mitigation_id: string;
  mitigation_title: string;
  assignee_id: string;
  assignee_name: string;
  assigned_by_name: string;
  assigned_at: string;
}

/** A member of the file's organisation a mitigation can go to. Not yet in Turva's API. */
export interface Member {
  id: string;
  name: string;
}

/** One mitigation the signed-in person has been asked to evidence. Not yet in Turva's API. */
export interface MyAssignment {
  id: string;
  slug: string;
  file_name: string;
  organisation: string;
  assigned_by_name: string;
  assigned_at: string;
  mitigation: Mitigation;
  head_sha: string | null;
}

/** The statuses an assignee may set; withdrawing is the officer's. Not yet in Turva's API. */
export type AssigneeStatus = "proposed" | "implemented" | "verified";

/** A hazard workshop, as a form would send it. Not yet in Turva's API. */
export interface WorkshopInput {
  held_on: string;
  attendees: string[];
  hazards: string[];
  notes: string;
}

/**
 * What the components ahead of the API read about a file, beside what
 * `SafetyFileDetail` already carries. Not yet in Turva's API.
 */
export interface SafetyFileExtras {
  safety_file: SafetyFile;
  status: SafetyFileStatus;
  documents: DocumentRef[];
  posts: Post[];
  process: SafetyProcess | null;
  sign_offs: SignOffs | null;
  assignments: Assignment[];
  members: Member[];
}

/** An assessment as the preview serves it, before anything is saved. */
export type AssessmentPreview = Assessment;
