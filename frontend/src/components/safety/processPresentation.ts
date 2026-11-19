import type { ProcessStep, SafetyProcess } from "@/lib/safety";

/** Refuse contradictory display data; this does not evaluate clinical completion. */
export function processStepsProblem(steps: ProcessStep[]): string | null {
  if (
    steps.some((step) => !step.id.trim()) ||
    new Set(steps.map((step) => step.id)).size !== steps.length
  )
    return "Process step identities are missing or duplicated.";
  if (steps.some((step) => step.done && step.reasons.length > 0))
    return "A process step is marked done but still has outstanding requirements.";
  return null;
}

export function processProblem(process: SafetyProcess): string | null {
  const problem = processStepsProblem(process.steps);
  if (problem) return problem;
  if (process.steps.length === 0) return "No process steps were supplied.";
  const firstOutstanding = process.steps.find((step) => !step.done);
  if (process.next_step !== (firstOutstanding?.id ?? null))
    return "The next-step reference is inconsistent with the supplied process steps.";
  return null;
}
