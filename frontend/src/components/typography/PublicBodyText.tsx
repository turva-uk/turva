/**
 * PublicBodyText Component
 *
 * Wrapper around BodyText that defaults to `gray.3` for use on
 * dark public-site backgrounds. Ensures legible light text in both
 * Storybook (light root) and MPA pages (dark root).
 */

import BodyText from "./BodyText";
import type { BodyTextProps } from "./BodyText";

export default function PublicBodyText({ c = "gray.4", ...rest }: BodyTextProps) {
  return <BodyText c={c} {...rest} />;
}
