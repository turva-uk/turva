/**
 * ExternalTextLink Component
 *
 * A link inside a sentence to a page outside the app, such as a policy on
 * the public site. Looks the same as `TextLink`, which only follows routes
 * inside the app. Opens in a new tab, so a half-filled form is not lost.
 */

import { Anchor, VisuallyHidden } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./TextLink.module.css";

interface ExternalTextLinkProps {
  /** Absolute address of the page to open */
  href: string;
  /** Link content */
  children: ReactNode;
}

/**
 * Renders an external link in the `--link-color` token. A screen reader
 * is told that it opens in a new tab, which a sighted reader is not: the
 * link sits inside a sentence, and the words would break it up.
 *
 * @param props - Component props
 * @returns Styled anchor element opening in a new tab
 */
export default function ExternalTextLink({ href, children }: ExternalTextLinkProps) {
  return (
    <Anchor
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      size="md"
      underline="always"
      className={classes.link}
    >
      {children}
      <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
    </Anchor>
  );
}
