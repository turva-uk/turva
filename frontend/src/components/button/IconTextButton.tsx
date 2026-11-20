/**
 * IconTextButton Component
 *
 * A button with a leading icon and text label. Icons are restricted to a
 * known set - passing an unlisted icon name causes a TypeScript error.
 * Mirrors the AddButton pattern for consistent sizing and responsiveness.
 *
 * @example
 * ```tsx
 * <IconTextButton icon="refresh" label="Sync all" onClick={handleSync} />
 * ```
 */

import { Button } from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import Icon from "@/components/icons";
import iconTextButtonIcons from "./iconTextButtonIcons";
import classes from "./IconTextButton.module.css";

type IconName = keyof typeof iconTextButtonIcons;

interface IconTextButtonProps {
  /** Icon to display (must be a registered name) */
  icon: IconName;
  /** Button label text */
  label: string;
  /** Click handler */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Button colour (default: Mantine primary) */
  color?: MantineColor;
  /** Mantine button variant (default: "filled") */
  variant?: "filled" | "light" | "outline";
  /** Stretch button to fill parent width */
  fullWidth?: boolean;
  /**
   * A fuller name for screen readers, where several buttons share one
   * label: three "Remove file" buttons need to say which file each one
   * removes. It must start with the visible label, so speech input users
   * can say what they see: "Remove file als.pdf", never "Remove als.pdf".
   */
  "aria-label"?: string;
}

/**
 * IconTextButton displays a button with a leading icon and text.
 *
 * Features:
 * - Type-safe icon selection via string literal union
 * - Consistent md sizing with AddButton/ButtonPair
 */
export default function IconTextButton({
  icon,
  label,
  onClick,
  disabled = false,
  loading = false,
  color,
  variant = "filled",
  fullWidth = false,
  "aria-label": ariaLabel,
}: IconTextButtonProps) {
  return (
    <Button
      leftSection={<Icon icon={iconTextButtonIcons[icon]} size="sm" fixed />}
      onClick={disabled ? (e: React.MouseEvent) => e.preventDefault() : onClick}
      size="md"
      variant={variant}
      color={color}
      fullWidth={fullWidth}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      loading={loading}
      classNames={{ root: classes.root }}
      styles={{
        root: disabled ? { opacity: 0.6, cursor: "default" } : undefined,
      }}
    >
      {label}
    </Button>
  );
}
