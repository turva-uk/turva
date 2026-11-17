/**
 * The risk level the server derives from a severity and likelihood,
 * asked as they are chosen.
 *
 * Shared by `HazardForm` and `ExtractionReview`, which both show a level
 * before anything is saved. The browser never works the level out: it
 * asks `previewAssessment`, so the server's matrix is the only one
 * (TH-008).
 *
 * A new pair cancels the request for the old one, so an answer that
 * arrives late is never shown against scores it was not for. Without
 * both scores there is nothing to ask, and nothing is shown.
 */

import { useEffect, useState } from "react";

import type { Assessment, RiskScore } from "@/lib/safety";

/** Asks for the level the server derives from a severity and likelihood. */
export type PreviewAssessment = (
  severity: RiskScore,
  likelihood: RiskScore,
  signal?: AbortSignal,
) => Promise<Assessment>;

export type Preview =
  | { state: "none" }
  | { state: "working" }
  | { state: "ready"; assessment: Assessment }
  | { state: "failed" };

export function useAssessmentPreview(
  severity: RiskScore | null,
  likelihood: RiskScore | null,
  preview: PreviewAssessment,
): Preview {
  const [result, setResult] = useState<{ key: string; preview: Preview }>({
    key: "",
    preview: { state: "working" },
  });
  const key = `${severity},${likelihood}`;

  useEffect(() => {
    if (severity === null || likelihood === null) return;

    const controller = new AbortController();

    preview(severity, likelihood, controller.signal).then(
      (assessment) => {
        if (!controller.signal.aborted) {
          setResult({ key, preview: { state: "ready", assessment } });
        }
      },
      () => {
        if (!controller.signal.aborted) setResult({ key, preview: { state: "failed" } });
      },
    );

    return () => controller.abort();
  }, [key, severity, likelihood, preview]);

  if (severity === null || likelihood === null) return { state: "none" };

  return result.key === key ? result.preview : { state: "working" };
}
