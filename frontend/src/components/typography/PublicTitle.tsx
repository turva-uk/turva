/**
 * PublicTitle Component
 *
 * Hero title for public-facing pages. Supports an accent colour applied to
 * words wrapped in *asterisks* and an optional subtitle below.
 */

import PublicBodyText from "@/components/typography/PublicBodyText";
import { Box, Title } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./PageHeader.module.css";

/**
 * Parse a title string, converting `*word*` markers into amber italic spans.
 * Plain text is returned as-is; marked segments become styled `<span>` elements.
 */
function parseTitle(title: string, accentColour: string): ReactNode {
  const parts = title.split(/(\*[^*]+\*)/g);
  if (parts.length === 1) return title;
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <span key={i} style={{ color: accentColour, fontStyle: "italic" }}>
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

export interface PublicTitleProps {
  /** Title text - wrap a word in *asterisks* for amber italic accent */
  title: string;
  /** Optional description/subtitle text */
  description?: string;
  /** Size variant - defaults to lg */
  size?: "sm" | "md" | "lg";
  /** Text alignment - defaults to center */
  ta?: "left" | "center" | "right";
  /** Base text colour - defaults to amber */
  c?: string;
  /** Accent colour for *marked* words - defaults to amber */
  accentColour?: string;
}

export default function PublicTitle({
  title,
  description,
  size = "lg",
  ta = "center",
  c = "var(--mantine-color-secondary-5)",
  accentColour = "var(--mantine-color-secondary-5)",
}: PublicTitleProps) {
  const orderMap = {
    sm: 3,
    md: 2,
    lg: 1,
  } as const;

  const order = orderMap[size];

  return (
    <Box>
      <Title
        order={order}
        c={c}
        ta={ta}
        mb={description ? "xs" : undefined}
        ff="'Cormorant Garamond Variable', serif"
        className={
          size === "lg" ? classes.lgTitle : size === "md" ? classes.mdTitle : undefined
        }
      >
        {parseTitle(title, accentColour)}
      </Title>
      {description && (
        <PublicBodyText justify={ta === "center" ? "centre" : ta}>{description}</PublicBodyText>
      )}
    </Box>
  );
}
