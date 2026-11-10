import { Text } from "@mantine/core";

import type { Assessment } from "../api/types";

/**
 * A risk assessment, rendered as severity, likelihood and the derived level.
 *
 * **The number is always shown, and colour is never the only signal.** Risk
 * level is safety-relevant information, and some readers cannot distinguish
 * the hues it would otherwise be carried by - so this component exists to make
 * that rule impossible to forget rather than something each screen has to
 * remember.
 *
 * It is also the one place that knows how a risk level is presented. The
 * hazard table, a hazard detail view, the matrix and the exported document
 * will all want it, and three hand-rolled versions is three chances to show a
 * number that disagrees with the assessment beside it.
 *
 * `risk_level` comes from the API, derived by the storage layer from severity
 * and likelihood. It is never entered, and this component deliberately does
 * not recompute it: a second implementation of the matrix is a second thing
 * that can be wrong. See TH-008.
 */
export function RiskLevel({ assessment, label }: { assessment: Assessment; label?: string }) {
  const { severity, likelihood, risk_level, risk_label } = assessment;

  return (
    <Text
      component="span"
      size="sm"
      aria-label={`${label ? `${label} ` : ""}severity ${severity}, likelihood ${likelihood}, risk level ${risk_level}${risk_label ? `, ${risk_label}` : ""}`}
    >
      S{severity} L{likelihood} &rarr; <strong>{risk_level}</strong>
      {risk_label && <> - {risk_label}</>}
    </Text>
  );
}
