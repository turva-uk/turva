/**
 * ActionCardButton Component
 *
 * A light-variant, full-width button used inside ActionCard components.
 * Supports either an onClick handler or a URL link destination. A
 * destructive one is red, for an action such as deactivating a site that
 * takes something away.
 *
 * @example
 * ```tsx
 * <ActionCardButton label="View details" url="/safety-files/discharge-summary" />
 * <ActionCardButton label="Create record" onClick={handleCreate} />
 * ```
 */

import { Button } from "@mantine/core";
import { Link } from "react-router";

interface ActionCardButtonProps {
  /** Button label text */
  label: string;
  /** Button destination URL (renders as a link) */
  url?: string;
  /** Click handler (takes priority over url) */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Mantine button variant (default: "light") */
  variant?: "light" | "filled";
  /** Red, for an action that takes something away (default: false) */
  destructive?: boolean;
}

export default function ActionCardButton({
  label,
  url = "#",
  onClick,
  disabled = false,
  variant = "filled",
  destructive = false,
}: ActionCardButtonProps) {
  // The status alert red, as `ButtonPairRed` and `ConfirmModal` use: not
  // Mantine's "red", which this theme does not define.
  const color = destructive ? "var(--alert-color)" : undefined;

  if (onClick) {
    return (
      <Button
        onClick={disabled ? undefined : onClick}
        variant={variant}
        fullWidth
        disabled={disabled}
        size="md"
        color={color}
      >
        {label}
      </Button>
    );
  }

  if (disabled) {
    return (
      <Button variant={variant} fullWidth disabled size="md" color={color}>
        {label}
      </Button>
    );
  }

  return (
    <Button
      component={Link}
      to={url ?? "#"}
      variant={variant}
      fullWidth
      size="md"
      color={color}
    >
      {label}
    </Button>
  );
}
