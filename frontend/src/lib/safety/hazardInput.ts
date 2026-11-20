/**
 * A hazard as a form edits it: a new one, one read from the file, and
 * Turva's layout rules 6 and 7 as an officer would hear them.
 *
 * Kept apart from `HazardForm` so the component file exports only the
 * component, and so a page can start a form without importing its UI.
 *
 * A `HazardInput` has no risk level. `hazardInputFrom` reads a hazard
 * that carries one and leaves it behind, so a level read from the file
 * can never be sent back as if somebody had chosen it.
 */

import { isRiskScore } from "./risk";
import type { Assessment, AssessmentInput, Hazard, HazardDraft, HazardInput } from "./types";
import { isHazardStatus } from "./types";

/** What a new hazard starts as. */
export function blankHazard(owner = ""): HazardDraft {
  return {
    title: "",
    status: "open",
    owner,
    cause: "",
    effect: "",
    harm: "",
    initial: { severity: null, likelihood: null },
    residual: { severity: null, likelihood: null },
    justification: "",
    body: "",
  };
}

/** Severity and likelihood only: the level stays behind. */
function scoresOf(assessment: Assessment, which: string): AssessmentInput {
  const { severity, likelihood } = assessment;

  if (!isRiskScore(severity) || !isRiskScore(likelihood)) {
    throw new Error(`The ${which} assessment is not on the 5 by 5 matrix.`);
  }

  return { severity, likelihood };
}

/**
 * A hazard as the form edits it.
 *
 * @throws Error if the file holds a status or score Turva's API would not
 *   accept back, rather than quietly sending a different one.
 */
export function hazardInputFrom(hazard: Hazard): HazardInput {
  if (!isHazardStatus(hazard.status)) {
    throw new Error(`${hazard.id} has a status Turva does not know: ${hazard.status}.`);
  }

  return {
    title: hazard.title,
    status: hazard.status,
    owner: hazard.owner,
    cause: hazard.cause,
    effect: hazard.effect,
    harm: hazard.harm,
    initial: scoresOf(hazard.initial, "initial"),
    residual: scoresOf(hazard.residual, "residual"),
    justification: hazard.justification,
    body: hazard.body,
  };
}

/** Turva's layout rules 6 and 7, as the officer would hear them. */
export function hazardProblems(input: HazardDraft): string[] {
  const problems: string[] = [];

  if (!input.title.trim()) problems.push("Give the hazard a title.");

  for (const which of ["initial", "residual"] as const) {
    for (const score of ["severity", "likelihood"] as const) {
      if (!isRiskScore(input[which][score])) problems.push(`Choose the ${which} ${score}.`);
    }
  }

  if (
    isRiskScore(input.residual.severity) &&
    isRiskScore(input.initial.severity) &&
    input.residual.severity > input.initial.severity
  ) {
    problems.push(
      "Residual severity cannot be higher than initial severity. If the risk rose, that is a new assessment.",
    );
  }

  if (
    isRiskScore(input.residual.likelihood) &&
    isRiskScore(input.initial.likelihood) &&
    input.residual.likelihood > input.initial.likelihood
  ) {
    problems.push(
      "Residual likelihood cannot be higher than initial likelihood. If the risk rose, that is a new assessment.",
    );
  }

  if (input.status === "closed" && !input.justification.trim()) {
    problems.push(
      "A closed hazard needs a justification. Hazards are never deleted, only closed with a reason.",
    );
  }

  return problems;
}
