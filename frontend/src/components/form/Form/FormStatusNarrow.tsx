/**
 * FormStatusNarrow Component
 *
 * Compact inline error display for narrow forms (login, registration).
 * Subscribes to Form context in production, accepts props in Storybook.
 *
 * - Only renders for error, validation_error, and timeout states
 * - Renders nothing in idle, validating, submitting, success, and partial_success states
 * - Uses the ErrorMessage typography component for consistent styling
 *
 * @example
 * ```tsx
 * // Inside a <Form> wrapper - no props needed
 * <FormStatusNarrow />
 *
 * // In Storybook - prop-driven
 * <FormStatusNarrow message="Invalid username or password" />
 * ```
 */

import type { ReactNode } from "react";
import ErrorMessage from "@/components/typography/ErrorMessage";
import { useFormContext } from "./FormContext";

interface FormStatusNarrowPropsFromContext {
  /** When used inside a <Form>, no props needed */
  message?: never;
}

interface FormStatusNarrowPropsManual {
  /** Error message to display - for Storybook or standalone use */
  message: ReactNode;
}

export type FormStatusNarrowProps =
  FormStatusNarrowPropsFromContext | FormStatusNarrowPropsManual;

function isManualProps(props: FormStatusNarrowProps): props is FormStatusNarrowPropsManual {
  return "message" in props && props.message !== undefined;
}

function FormStatusNarrowFromContext() {
  const { formState, statusMessage } = useFormContext();

  if (formState !== "error" && formState !== "validation_error" && formState !== "timeout") {
    return null;
  }

  if (!statusMessage) return null;

  return <ErrorMessage>{statusMessage.title}</ErrorMessage>;
}

export default function FormStatusNarrow(props: FormStatusNarrowProps) {
  if (isManualProps(props)) {
    return <ErrorMessage>{props.message}</ErrorMessage>;
  }

  return <FormStatusNarrowFromContext />;
}
