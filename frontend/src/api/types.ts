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
  safety_file: SafetyFile;
  repository_missing: boolean;
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

export interface HazardDetail {
  safety_file: SafetyFile;
  hazard: Hazard;
  mitigations: Mitigation[];
  history: Commit[];
  problems: string[];
  head_sha: string;
}
