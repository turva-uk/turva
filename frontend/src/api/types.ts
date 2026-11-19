/**
 * Types mirroring the API's responses.
 *
 * Field names are snake_case, matching the API exactly. The frontend this
 * replaced transformed every payload to camelCase with lodash on the way in
 * and back on the way out, which cost a dependency, a pair of recursive
 * transforms, and a class of bug where a field silently failed to round-trip.
 * Reading `hazard.risk_level` in a component is a small price for payloads
 * that are identical on both sides of the wire and greppable across the whole
 * repository.
 */

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  organisation: string;
  job_role: string;
  professional_regulator: string;
  registration_number: string;
  professional_registration: string;
  /** Whether a human checked this against the regulator's public register.
   *  Turva never sets it automatically, and the interface must not imply it
   *  did. See TH-009. */
  registration_verified: boolean;
  is_cso: boolean;
  cso_declared_at: string | null;
  is_verified: boolean;
  is_staff: boolean;
}

export interface Session {
  authenticated: boolean;
  user: User | null;
}

export interface RegistrationInput {
  email: string;
  first_name: string;
  last_name: string;
  organisation: string;
  password: string;
}

export interface SafetyFile {
  id: string;
  slug: string;
  name: string;
  standard: string;
  standard_display: string;
  organisation: string;
  owner_name: string;
  visibility: "public" | "private";
  url: string;
  exists_on_disk: boolean;
  created_at: string;
  updated_at: string;
}

/** Severity and likelihood, with risk level **derived** from them by the
 *  storage layer. The client never sends a risk level and cannot set one. */
export interface Assessment {
  severity: number;
  likelihood: number;
  risk_level: number;
  risk_label: string;
}

export interface Hazard {
  id: string;
  title: string;
  status: string;
  owner: string;
  created: string;
  updated: string;
  initial: Assessment;
  residual: Assessment;
  cause: string;
  effect: string;
  harm: string;
  justification: string;
  mitigations: string[];
  requires_elimination: boolean;
  body: string;
}

export interface Mitigation {
  id: string;
  title: string;
  status: string;
  owner: string;
  created: string;
  updated: string;
  control_type: string;
  evidence: string;
  hazards: string[];
  body: string;
}

/** One entry in the audit trail: the record a regulator or a court would
 *  examine. The author is never a service account. */
export interface Commit {
  short_sha: string;
  subject: string;
  author_name: string;
  author_email: string;
  committed_at: string;
}

export interface SafetyFileDetail {
  can_manage_team?: boolean;
  team?: FileTeam | null;
  safety_file: SafetyFile;
  can_edit: boolean;
  repository_missing: boolean;
  /** The controlled, read-only safety documents. Absent when the repository is missing. */
  documents?: SafetyDocumentSummary[];
  /** Present only when the repository is missing from disk. */
  repository_path?: string;
  hazards?: Hazard[];
  mitigations?: Mitigation[];
  /** Hazard IDs still open at a residual risk level requiring elimination. */
  blocking?: string[];
  history?: Commit[];
  problems?: string[];
  head_sha?: string;
}

export interface OrganisationMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  active: boolean;
  is_administrator: boolean;
  is_cso: boolean;
  eligible_cso: boolean;
  appointment_id: string | null;
  profile_declared: boolean;
  revision: number;
}

export interface OrganisationSummary {
  id: string;
  name: string;
  membership: OrganisationMember;
}

export interface OrganisationInvitation {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

export interface OrganisationDetail extends OrganisationSummary {
  members: OrganisationMember[];
  invitations?: OrganisationInvitation[];
  files?: { slug: string; name: string }[];
  events?: { action: string; subject: string; created_at: string; actor__email: string }[];
}

export interface TeamPerson {
  user_id: string;
  membership_id: string;
  appointment_id: string;
  name: string;
  email: string;
}

export interface FileTeam {
  organisation_id: string;
  organisation_name: string;
  accountable: TeamPerson;
  collaborators: TeamPerson[];
  reason: string;
}

export interface FileTeamDetail {
  file_name: string;
  slug: string;
  team: FileTeam | null;
  head_sha: string;
  can_manage: boolean;
  choices: { id: string; name: string; csos: OrganisationMember[] }[];
}

export interface HazardDetail {
  safety_file: SafetyFile;
  can_edit: boolean;
  hazard: Hazard;
  mitigations: Mitigation[];
  history: Commit[];
  problems: string[];
  head_sha: string;
}

export interface HazardOptions {
  severity: { value: string; label: string }[];
  likelihood: { value: string; label: string }[];
  statuses: string[];
}

export interface MitigationDetail {
  safety_file: SafetyFile;
  can_edit: boolean;
  mitigation: Mitigation;
  hazards: Hazard[];
  history: Commit[];
  problems: string[];
  head_sha: string;
}

export interface MitigationOptions {
  statuses: string[];
  control_types: string[];
}

export interface SafetyDocumentSummary {
  key: string;
  title: string;
}

/**
 * An allowlisted document tree built by the API from committed Markdown. The
 * browser renders it as React elements; it never receives an HTML string.
 */
export type DocumentNode =
  | { type: "text"; text: string }
  | {
      type: "element";
      tag: string;
      attrs?: {
        id?: string;
        start?: number;
        colspan?: number;
        rowspan?: number;
        align?: string;
      };
      children?: DocumentNode[];
    }
  | {
      type: "admonition";
      kind: string;
      title: string;
      /** The title uses the same sanitised tree and omission accounting as the body. */
      title_nodes?: DocumentNode[];
      collapsible: boolean;
      children: DocumentNode[];
    }
  | { type: "anchor"; fragment: string; children: DocumentNode[] }
  | { type: "external"; href: string; children: DocumentNode[] }
  | { type: "document"; document: string; fragment?: string; children: DocumentNode[] }
  | { type: "reference"; text: string }
  | { type: "unsupported"; description: string };

export interface SafetyDocumentContent {
  key: string;
  title: string;
  path: string;
  /** The full commit the document was read at. */
  source_commit: string;
  available: boolean;
  reason?: string;
  message?: string;
  blocks: DocumentNode[];
  /** How many items in the source are not displayed. */
  unsupported: number;
}

export interface SafetyDocumentDetail {
  safety_file: SafetyFile;
  documents: SafetyDocumentSummary[];
  document: SafetyDocumentContent;
  last_changed: Commit | null;
  head_sha: string;
}
