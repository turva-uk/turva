/**
 * Typed calls to Turva's safety routes.
 *
 * Every call goes through `api` in `@/api/client`, so the CSRF header,
 * the session cookie and the errors are the client's, never repeated
 * here. Every write sends `expected_head`, the `head_sha` the caller
 * read: the server refuses a write without it, and answers 409 when the
 * file has moved on since, so a stale form cannot overwrite somebody
 * else's change.
 *
 * Nothing here can send a risk level. The inputs carry severity and
 * likelihood only, and `previewAssessment` asks the server for the level
 * a form shows, so the server's matrix is the only one (TH-008).
 *
 * Only routes Turva has are here. The components for features it lacks
 * take their data as props.
 */

import { api, ApiError } from "@/api/client";
import { isRiskScore } from "./risk";
import type {
  HazardDetail,
  HazardOptions,
  MitigationDetail,
  MitigationOptions,
  SafetyFile,
  SafetyFileDetail,
} from "@/api/types";

import type {
  AssessmentPreview,
  HazardInput,
  HazardWrite,
  MitigationInput,
  MitigationWrite,
  RiskScore,
  SafetyFileInput,
} from "./types";

const FILES = "/safety-files/";

/** Identifiers are data, never URL syntax. Match Django's ASCII slug alphabet. */
function routeIdentifier(value: string, kind: string): string {
  if (typeof value !== "string" || value.length === 0 || /[^a-zA-Z0-9_-]/.test(value)) {
    throw new Error(`Invalid ${kind} identifier.`);
  }
  return encodeURIComponent(value);
}

/** Reject dot segments/separators before browser or proxy URL normalisation. */
function filePath(slug: string): string {
  return `${FILES}${routeIdentifier(slug, "safety-file")}/`;
}

/* ------------------------------------------------------------------ */
/*  Files                                                              */
/* ------------------------------------------------------------------ */

/** The safety files the signed-in person may see. */
export function listFiles(signal?: AbortSignal): Promise<SafetyFile[]> {
  return api.get<SafetyFile[]>(FILES, signal);
}

/** Creates a safety file from its template. */
export function createFile(input: SafetyFileInput): Promise<SafetyFile> {
  return api.post<SafetyFile>(FILES, input);
}

/** One file, read from its repository: hazards, mitigations, history and `head_sha`. */
export async function getFile(slug: string, signal?: AbortSignal): Promise<SafetyFileDetail> {
  return api.get<SafetyFileDetail>(filePath(slug), signal);
}

/** The file as a PDF, at the version the caller read. */
export async function downloadPdf(slug: string, headSha: string): Promise<Blob> {
  return api.download(`${filePath(slug)}pdf/?expected_head=${encodeURIComponent(headSha)}`);
}

/* ------------------------------------------------------------------ */
/*  Hazards                                                            */
/* ------------------------------------------------------------------ */

/** Records a new hazard. */
export async function addHazard(
  slug: string,
  input: HazardInput,
  headSha: string,
): Promise<HazardWrite> {
  return api.post<HazardWrite>(`${filePath(slug)}hazards/`, {
    ...input,
    expected_head: headSha,
  });
}

/** One hazard, with its mitigations and its own history. */
export async function getHazard(
  slug: string,
  hazardId: string,
  signal?: AbortSignal,
): Promise<HazardDetail> {
  return api.get<HazardDetail>(
    `${filePath(slug)}hazards/${routeIdentifier(hazardId, "hazard")}/`,
    signal,
  );
}

/** Saves a change to a hazard. Fields left out stay as they are. */
export async function updateHazard(
  slug: string,
  hazardId: string,
  input: Partial<HazardInput>,
  headSha: string,
): Promise<HazardWrite> {
  return api.patch<HazardWrite>(
    `${filePath(slug)}hazards/${routeIdentifier(hazardId, "hazard")}/`,
    {
      ...input,
      expected_head: headSha,
    },
  );
}

/* ------------------------------------------------------------------ */
/*  Mitigations                                                        */
/* ------------------------------------------------------------------ */

/** Records a new mitigation. */
export async function addMitigation(
  slug: string,
  input: MitigationInput,
  headSha: string,
): Promise<MitigationWrite> {
  return api.post<MitigationWrite>(`${filePath(slug)}mitigations/`, {
    ...input,
    expected_head: headSha,
  });
}

/** One mitigation, with the hazards it controls and its own history. */
export async function getMitigation(
  slug: string,
  mitigationId: string,
  signal?: AbortSignal,
): Promise<MitigationDetail> {
  return api.get<MitigationDetail>(
    `${filePath(slug)}mitigations/${routeIdentifier(mitigationId, "mitigation")}/`,
    signal,
  );
}

/** Saves a change to a mitigation. Fields left out stay as they are. */
export async function updateMitigation(
  slug: string,
  mitigationId: string,
  input: Partial<MitigationInput>,
  headSha: string,
): Promise<MitigationWrite> {
  return api.patch<MitigationWrite>(
    `${filePath(slug)}mitigations/${routeIdentifier(mitigationId, "mitigation")}/`,
    { ...input, expected_head: headSha },
  );
}

/* ------------------------------------------------------------------ */
/*  Options and the risk preview                                       */
/* ------------------------------------------------------------------ */

/** The severity and likelihood scales, with labels, and the hazard statuses. */
export function hazardOptions(signal?: AbortSignal): Promise<HazardOptions> {
  return api.get<HazardOptions>("/hazard-options/", signal);
}

/** The mitigation statuses and control types. */
export function mitigationOptions(signal?: AbortSignal): Promise<MitigationOptions> {
  return api.get<MitigationOptions>("/mitigation-options/", signal);
}

/**
 * The risk level the server derives from a severity and likelihood,
 * before anything is saved. What a form shows while somebody chooses.
 */
export async function previewAssessment(
  severity: RiskScore,
  likelihood: RiskScore,
  signal?: AbortSignal,
): Promise<AssessmentPreview> {
  if (!isRiskScore(severity) || !isRiskScore(likelihood)) {
    throw new Error("Assessment scores must be integers from 1 to 5.");
  }
  return api.get<AssessmentPreview>(
    `/assessment-preview/?severity=${severity}&likelihood=${likelihood}`,
    signal,
  );
}

/* ------------------------------------------------------------------ */
/*  Failures                                                           */
/* ------------------------------------------------------------------ */

/** The file moved on since it was read: somebody else saved first. */
export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

/** No such file, hazard or mitigation, or one the person may not see. */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
