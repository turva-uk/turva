/**
 * The scores on Turva's 5 by 5 risk matrix.
 *
 * Only the scores. Quill kept a copy of the matrix in the browser and
 * looked a level up from it; Turva does not, because a second matrix is
 * a second place to get a level wrong (TH-008). The level a form shows
 * comes from `previewAssessment`, and its labels from `hazardOptions`.
 */

import type { RiskScore } from "./types";

/** The scores, 1 to 5, for a select. */
export const RISK_SCORES: readonly RiskScore[] = [1, 2, 3, 4, 5];

/** Narrows a number Turva's API sends to a score on the matrix. */
export function isRiskScore(value: number): value is RiskScore {
  return (RISK_SCORES as readonly number[]).includes(value);
}
