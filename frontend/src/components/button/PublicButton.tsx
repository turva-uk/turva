/**
 * PublicButton Component
 *
 * Call-to-action button for public-facing pages. Supports filled and outline
 * variants with size options. Renders as an anchor when href is provided.
 */

import { Button } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./PublicButton.module.css";

export interface PublicButtonProps {
  /** Button label */
  children: ReactNode;
  /** Link URL - renders as an anchor when provided */
  href?: string;
  /** Size variant - defaults to md */
  size?: "sm" | "md" | "lg";
  /** Disabled state */
  disabled?: boolean;
  /** Outline on a dark brand surface instead of the yellow fill */
  variant?: "filled" | "outline";
  /** Click handler */
  onClick?: () => void;
}

export default function PublicButton({
  children,
  href,
  size = "md",
  disabled = false,
  variant = "filled",
  onClick,
}: PublicButtonProps) {
  const className = variant === "filled" ? classes.filled : classes.outline;

  if (href && !disabled) {
    return (
      <Button component="a" href={href} size={size} className={className} onClick={onClick}>
        {children}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      aria-disabled={disabled || undefined}
      styles={
        disabled
          ? {
              root: {
                opacity: 0.6,
                cursor: "default",
              },
            }
          : undefined
      }
      className={className}
      onClick={disabled ? (e: React.MouseEvent) => e.preventDefault() : onClick}
    >
      {children}
    </Button>
  );
}
