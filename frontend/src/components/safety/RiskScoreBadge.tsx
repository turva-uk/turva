/**
 * RiskScoreBadge Component
 *
 * A derived risk level: the level's number in a coloured badge with its
 * words beside it, such as "4 Mandatory elimination", never the colour
 * alone.
 *
 * The level is derived from severity and likelihood by Turva's matrix,
 * on the server, and arrives in the assessment; this component never
 * works it out (TH-008).
 *
 * Coloured by level: 1 and 2 acceptable, 3 undesirable, 4 and 5 must be
 * reduced before go-live.
 *
 * `compact` shows the number alone, for a table with two of these in a
 * row: a level's words run to "Acceptable if cost of reduction exceeds
 * benefit", and a badge never wraps. The number still says the level, not
 * the colour alone, and the words are in the tooltip and the screen
 * reader's label.
 *
 * @example
 * ```tsx
 * <RiskScoreBadge assessment={hazard.residual} />
 * <RiskScoreBadge assessment={hazard.residual} compact />
 * ```
 */

import { Badge, Group } from "@mantine/core";

import {
  badgeColours,
  BADGE_VARIANT,
  type BadgeColourConfig,
} from "@/components/badge/badgeColours";
import AppTooltip from "@/components/tooltip/AppTooltip";
import { BodyText, ErrorMessage } from "@/components/typography";
import { isRiskScore, type Assessment } from "@/lib/safety";

type Props = {
  /** The assessment, with the level the server derived */
  assessment: Assessment;
  /** Show the level's number alone, with its words in a tooltip */
  compact?: boolean;
};

function colourFor(level: number): BadgeColourConfig {
  if (level >= 4) return badgeColours.alert;
  if (level === 3) return badgeColours.warning;

  return badgeColours.success;
}

/** The level and both scores in words, as a screen reader hears them. */
function describeAssessment(assessment: Assessment): string {
  return (
    `Risk level ${assessment.risk_level}, ${assessment.risk_label}: ` +
    `severity ${assessment.severity}, likelihood ${assessment.likelihood}`
  );
}

export default function RiskScoreBadge({ assessment, compact = false }: Props) {
  if (
    !isRiskScore(assessment.risk_level) ||
    !isRiskScore(assessment.severity) ||
    !isRiskScore(assessment.likelihood) ||
    typeof assessment.risk_label !== "string" ||
    !assessment.risk_label.trim()
  ) {
    return (
      <span role="alert">
        <ErrorMessage>Risk assessment unavailable: unsupported recorded values.</ErrorMessage>
      </span>
    );
  }
  const colour = colourFor(assessment.risk_level);
  const words = describeAssessment(assessment);

  if (compact) {
    return (
      <AppTooltip label={words}>
        <Badge
          color={colour.bg}
          c={colour.text}
          variant={BADGE_VARIANT}
          aria-label={words}
          tabIndex={0}
          role="img"
          className="mantine-focus-auto"
        >
          {assessment.risk_level}
        </Badge>
      </AppTooltip>
    );
  }

  // The number in the badge and the words beside it, as text that wraps:
  // a badge of the whole label ran past the edge of a half-width card.
  // One name for the pair, so a screen reader hears the level once.
  return (
    <Group gap="xs" wrap="nowrap" align="center" role="img" aria-label={words}>
      <Badge color={colour.bg} c={colour.text} variant={BADGE_VARIANT}>
        {assessment.risk_level}
      </Badge>
      <BodyText>{assessment.risk_label}</BodyText>
    </Group>
  );
}
