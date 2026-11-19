/**
 * BaseCard Component
 *
 * Standard card wrapper enforcing consistent styling across the app.
 * All cards in the application should use BaseCard instead of Mantine's
 * Card directly. This ensures uniform shadow, padding, and radius.
 *
 * Fixed props (not overridable):
 *   shadow="sm"  padding="lg"  radius="md"
 *
 * A word longer than the card breaks inside itself, so nothing in a card
 * runs off the side of a phone. Set `wrapLongWords={false}` to turn that
 * off for one card.
 *
 * All other Mantine Card props are forwarded.
 */

import { Card, type CardProps } from "@mantine/core";
import { forwardRef, type ReactNode, type Ref } from "react";
import classes from "./BaseCard.module.css";

/**
 * Props for BaseCard.
 *
 * Extends Mantine CardProps and HTML div attributes, but omits the
 * fixed styling props so they cannot be overridden by consumers.
 * `children` is re-declared as required.
 *
 * Pass `bg` (a Mantine colour value) to create a coloured card - the
 * border is automatically removed and text defaults to white. Pass `c`
 * alongside it for a pale background, where white would be unreadable.
 */
export type BaseCardProps = Omit<
  CardProps,
  "children" | "shadow" | "padding" | "radius" | "withBorder"
> &
  Omit<React.HTMLAttributes<HTMLDivElement>, keyof CardProps> & {
    children: ReactNode;
    /**
     * Break a word longer than the card inside itself. Defaults to true.
     *
     * Turn it off only where a squeezed column would be worse than text
     * running out of the card.
     */
    wrapLongWords?: boolean;
  };

/**
 * Mantine's default shadows use very low opacity (4-5%) which is
 * invisible against coloured backgrounds. This provides a visible
 * shadow for coloured cards.
 */
const COLOURED_CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.22)";

const BaseCard = forwardRef(function BaseCard(
  { children, bg, c, style, className, wrapLongWords = true, ...rest }: BaseCardProps,
  ref: Ref<HTMLDivElement>,
) {
  const hasBg = !!bg;

  return (
    <Card
      ref={ref}
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder={!hasBg}
      className={className ? `${classes.card} ${className}` : classes.card}
      data-wrap-long-words={wrapLongWords || undefined}
      bg={bg}
      // White is the right default for a saturated fill, but only a
      // default: a pale background needs dark text, and forcing white
      // regardless left the card unreadable. An explicit `c` wins.
      c={c ?? (hasBg ? "white" : undefined)}
      // Mantine resolves objects, theme callbacks and nested arrays. Keep the
      // caller last, preserving the existing override order without spreading
      // an array's numeric keys into a DOM style object.
      style={[
        {
          overflow: "visible",
          ...(!hasBg && {
            backgroundColor: "var(--card-bg, var(--mantine-color-body))",
            borderColor: "var(--card-border-color, var(--mantine-color-gray-2))",
          }),
          ...(hasBg && { boxShadow: COLOURED_CARD_SHADOW }),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Card>
  );
});

export default BaseCard;
