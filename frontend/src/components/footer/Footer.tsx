/**
 * Footer Component
 *
 * A slim bar along the foot of every signed-in page, saying who is signed
 * in, on the right. It stays in view however far the page scrolls, so
 * somebody sharing a screen or a desk can always see whose account this is.
 *
 * Renders nothing without text.
 *
 * @example
 * ```tsx
 * <Footer text="Signed in as Dr Anita Patel" />
 * ```
 */

import { Group } from "@mantine/core";

import { BodyText } from "@/components/typography";
import classes from "./Footer.module.css";

export interface FooterProps {
  /** What the footer says, such as who is signed in */
  text?: string;
}

export default function Footer({ text }: FooterProps) {
  if (!text) return null;

  return (
    <Group component="footer" justify="flex-end" className={classes.footer}>
      <BodyText>{text}</BodyText>
    </Group>
  );
}
