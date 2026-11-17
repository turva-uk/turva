/**
 * TextLink Component
 *
 * Internal navigation link styled with the primary colour and permanent
 * underline. Wraps React Router's `Link` in a Mantine `Anchor` for
 * consistent typography sizing.
 */

import { Anchor } from "@mantine/core";
import type { ReactNode } from "react";
import { Link } from "react-router";
import classes from "./TextLink.module.css";

interface TextLinkProps {
  /** Internal route path to navigate to */
  to: string;
  /** Link content */
  children: ReactNode;
  /** Called when the link is followed, e.g. to close the modal it sits in */
  onClick?: () => void;
  /**
   * The link stands on its own line rather than inside a sentence, such
   * as "Forgot password?" under the login form. On a phone it is then at
   * least 44px tall, so it is easy to tap. WCAG exempts links inside a
   * sentence, which keep their line height.
   */
  standalone?: boolean;
}

/**
 * Renders an internal link in the `--link-color` token, which is
 * `primary-4` in light mode and `primary-1` in dark.
 *
 * @param props - Component props
 * @returns Styled anchor element wrapping a React Router Link
 */
export default function TextLink({ to, children, onClick, standalone = false }: TextLinkProps) {
  return (
    <Anchor
      component={Link}
      to={to}
      size="md"
      underline="always"
      className={standalone ? `${classes.link} ${classes.standalone}` : classes.link}
      onClick={onClick}
    >
      {children}
    </Anchor>
  );
}
