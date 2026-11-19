/**
 * ActionCard Component
 *
 * A reusable card component for displaying action items with an icon,
 * title, description, and call-to-action button.
 */

import { Stack, Group } from "@mantine/core";
import type { ReactElement } from "react";
import Icon, { type IconSize } from "@/components/icons";
import ActionCardButton from "@/components/button/ActionCardButton";
import BodyText from "@/components/typography/BodyText";
import Heading from "@/components/typography/Heading";
import BaseCard from "@/components/base-card/BaseCard";
import classes from "./ActionCard.module.css";

interface ActionCardProps {
  /** Icon element to display (from @tabler/icons-react) */
  icon?: ReactElement;
  /** Icon size - defaults to lg (48px desktop, 32px mobile) */
  iconSize?: IconSize;
  /** Card title */
  title: string;
  /** Card subtitle/description. Omit it when the title and action say enough */
  subtitle?: string;
  /** Button label text (required unless action is provided) */
  buttonLabel?: string;
  /** Button destination URL */
  buttonUrl?: string;
  /** Optional onClick handler (overrides URL navigation if provided) */
  onClick?: () => void;
  /** Optional disabled state for the button */
  disabled?: boolean;
  /**
   * Why the button is disabled, shown beneath it. A greyed-out button
   * with no reason reads as broken; this says what stops it. Shown only
   * while `disabled`.
   */
  disabledReason?: string;
  /** Remove max-width constraint so the card fills its container */
  fullWidth?: boolean;
  /** Button variant (default: "filled") */
  buttonVariant?: "light" | "filled";
  /** Make the button red, for an action that takes something away */
  buttonDestructive?: boolean;
  /** Custom action element (e.g. SolidSwitch) - replaces the button */
  action?: ReactElement;
}

/**
 * ActionCard displays a clickable card with an icon, title, description,
 * and action button. Used for dashboard quick actions and admin tasks.
 *
 * Max-width is constrained to 37.05rem (592.8px), which is 52% of the
 * Container size="lg" max-width (1140px).
 *
 * Icons default to size "lg" (48px on desktop, 32px on mobile) for
 * consistent prominent display across all action cards.
 */
export default function ActionCard({
  icon,
  iconSize = "lg",
  title,
  subtitle,
  buttonLabel,
  buttonUrl = "#",
  onClick,
  disabled = false,
  disabledReason,
  fullWidth = false,
  buttonVariant = "filled",
  buttonDestructive = false,
  action,
}: ActionCardProps) {
  return (
    <BaseCard maw={fullWidth ? undefined : "37.05rem"} h="100%" className={classes.card}>
      <Stack gap="md" h="100%">
        {icon ? (
          <Group className={classes.iconRow}>
            <div className={classes.iconWrap}>
              <Icon icon={icon} size={iconSize} />
            </div>
            <div className={classes.titleWrap}>
              <Heading>{title}</Heading>
            </div>
          </Group>
        ) : (
          <Heading>{title}</Heading>
        )}
        {subtitle && <BodyText>{subtitle}</BodyText>}
        <div
          style={{
            marginTop: "auto",
            marginBottom: "calc(var(--mantine-spacing-md) * -0.5)",
          }}
        />
        {action ?? (
          <ActionCardButton
            label={buttonLabel ?? ""}
            url={buttonUrl}
            onClick={onClick}
            disabled={disabled}
            variant={buttonVariant}
            destructive={buttonDestructive}
          />
        )}
        {disabled && disabledReason && <BodyText c="dimmed">{disabledReason}</BodyText>}
      </Stack>
    </BaseCard>
  );
}
