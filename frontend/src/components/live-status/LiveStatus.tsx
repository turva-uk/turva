/**
 * LiveStatus Component
 *
 * A visually hidden `role="status"` region that screen readers announce
 * whenever its message changes: "Loading" while a table fills, "3
 * results" after a search. Sighted users already see the skeleton or the
 * shorter list; this tells everyone else (WCAG 4.1.3 Status messages).
 *
 * It must stay mounted and change its text, not mount with text already
 * in it: most screen readers announce changes to a live region they
 * already know about, and many ignore one that arrives already filled.
 * So render it unconditionally and pass an empty message when there is
 * nothing to say.
 */

import { VisuallyHidden } from "@mantine/core";

export interface LiveStatusProps {
  /** What to announce; an empty string announces nothing */
  message: string;
}

export default function LiveStatus({ message }: LiveStatusProps) {
  return (
    <VisuallyHidden role="status" aria-live="polite" aria-atomic="true">
      {message}
    </VisuallyHidden>
  );
}
