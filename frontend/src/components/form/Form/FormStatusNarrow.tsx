/**
 * FormStatusNarrow Component
 *
 * Compact inline error display for narrow forms (sign-in, registration,
 * password reset), in place of `FormStatus`'s full card. Subscribes to Form
 * context in production, accepts props in Storybook.
 *
 * - Only renders for error, validation_error, and timeout states
 * - Renders nothing in idle, validating, submitting, success, and partial_success states
 * - Shows the title and the server's reason on one line, with
 *   `retainsDraft` adding that the entries were kept, as `FormStatus` does
 * - Is an alert, and takes focus when a submission fails, so a keyboard or
 *   screen reader user lands on it rather than on the button they pressed
 * - Uses the ErrorMessage typography component for consistent styling
 *
 * @example
 * ```tsx
 * // Inside a <Form> wrapper
 * <FormStatusNarrow retainsDraft />
 *
 * // In Storybook - prop-driven
 * <FormStatusNarrow message="Invalid username or password" />
 * ```
 */

import { Box } from "@mantine/core";
import { useEffect, useRef, type ReactNode } from "react";
import ErrorMessage from "@/components/typography/ErrorMessage";
import { useFormContext } from "./FormContext";
import { DRAFT_KEPT } from "./FormStatus";

interface FormStatusNarrowPropsFromContext {
  /** When used inside a <Form>, no message is needed */
  message?: never;
  /** Add "Your entries have not been cleared." to a failure */
  retainsDraft?: boolean;
}

interface FormStatusNarrowPropsManual {
  /** Error message to display - for Storybook or standalone use */
  message: ReactNode;
  retainsDraft?: never;
}

export type FormStatusNarrowProps =
  FormStatusNarrowPropsFromContext | FormStatusNarrowPropsManual;

function isManualProps(props: FormStatusNarrowProps): props is FormStatusNarrowPropsManual {
  return "message" in props && props.message !== undefined;
}

/** The title as a sentence, so the reason can follow it on the same line. */
function asSentence(title: string): string {
  return /[.!?]$/.test(title) ? title : `${title}.`;
}

/** The line itself: an alert, focused when `takesFocus` is set. */
function NarrowLine({ children, takesFocus }: { children: ReactNode; takesFocus: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!takesFocus) return;

    const id = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [takesFocus]);

  return (
    <Box
      ref={ref}
      role="alert"
      tabIndex={takesFocus ? -1 : undefined}
      data-testid="form-status-narrow"
    >
      <ErrorMessage>{children}</ErrorMessage>
    </Box>
  );
}

function FormStatusNarrowFromContext({ retainsDraft = false }: { retainsDraft?: boolean }) {
  const { formState, statusMessage } = useFormContext();

  if (formState !== "error" && formState !== "validation_error" && formState !== "timeout") {
    return null;
  }

  if (!statusMessage) return null;

  const { title, description } = statusMessage;

  // Keyed by the message, so a second, different failure mounts a new line
  // and takes focus again.
  return (
    <NarrowLine key={`${formState}:${title}`} takesFocus>
      {asSentence(title)}
      {description ? <> {description}</> : null}
      {retainsDraft ? ` ${DRAFT_KEPT}` : null}
    </NarrowLine>
  );
}

export default function FormStatusNarrow(props: FormStatusNarrowProps) {
  if (isManualProps(props)) {
    return <NarrowLine takesFocus={false}>{props.message}</NarrowLine>;
  }

  return <FormStatusNarrowFromContext retainsDraft={props.retainsDraft} />;
}
