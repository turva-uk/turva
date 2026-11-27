/**
 * A mitigation as a form edits it: a new one, one read from the file, and
 * what must be true before it can be saved.
 *
 * Kept apart from `MitigationForm` so the component file exports only the
 * component, and so a page can start a form without importing its UI.
 *
 * A mitigation's status never changes a hazard's assessment. Nothing here
 * reads or sends a risk level.
 */

import type { Mitigation, MitigationDraft, MitigationInput } from "./types";
import { isControlType, isMitigationStatus } from "./types";

/** What a new mitigation starts as: proposed, with no control type assumed. */
export function blankMitigation(owner = "", hazards: string[] = []): MitigationDraft {
  return {
    title: "",
    status: "proposed",
    owner,
    control_type: null,
    hazards,
    evidence: "",
    body: "",
  };
}

/**
 * A mitigation as the form edits it.
 *
 * @throws Error if the file holds a status or control type Turva's API
 *   would not accept back, rather than quietly sending a different one.
 */
export function mitigationInputFrom(mitigation: Mitigation): MitigationDraft {
  if (!isMitigationStatus(mitigation.status)) {
    throw new Error(`${mitigation.id} has a status Turva does not know: ${mitigation.status}.`);
  }

  const recorded = mitigation.control_type;
  if (recorded && !isControlType(recorded)) {
    throw new Error(`${mitigation.id} has a control type Turva does not know: ${recorded}.`);
  }
  const controlType = isControlType(recorded) ? recorded : null;

  return {
    title: mitigation.title,
    status: mitigation.status,
    owner: mitigation.owner,
    control_type: controlType,
    hazards: [...mitigation.hazards],
    evidence: mitigation.evidence,
    body: mitigation.body,
  };
}

/** What stops a mitigation being saved, as the officer would hear it. */
export function mitigationProblems(draft: MitigationDraft): string[] {
  const problems: string[] = [];

  if (!draft.title.trim()) problems.push("Give the mitigation a title.");
  if (!draft.owner.trim()) problems.push("Give the email address of the responsible person.");
  if (draft.control_type === null) problems.push("Choose a control type.");
  if (
    (draft.status === "implemented" || draft.status === "verified") &&
    !draft.evidence.trim()
  ) {
    problems.push(
      `A mitigation marked ${draft.status} needs implementation and verification evidence.`,
    );
  }

  return problems;
}

/** The draft as Turva's API takes it, once nothing stops it being saved. */
export function completeMitigation(draft: MitigationDraft): MitigationInput | null {
  if (draft.control_type === null || mitigationProblems(draft).length > 0) return null;

  return { ...draft, control_type: draft.control_type };
}
