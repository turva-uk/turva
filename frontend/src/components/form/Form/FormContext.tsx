/**
 * Form Context
 *
 * Provides form submission state to child components via React context.
 * Extends React Hook Form with Quill-specific states:
 * partial_success, timeout, and composite outcome modelling.
 */

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Form submission states.
 *
 * - idle: no submission attempted
 * - validating: client-side validation running
 * - submitting: request in flight
 * - success: full success
 * - partial_success: composite write where some layers succeeded
 * - error: server rejected or validation failed
 * - validation_error: client-side validation failed (warning severity)
 * - timeout: request exceeded configured timeout
 */
export type FormState =
  | "idle"
  | "validating"
  | "submitting"
  | "success"
  | "partial_success"
  | "error"
  | "validation_error"
  | "timeout";

export interface FormStatusMessage {
  /** Status message title */
  title: string;
  /** Optional description or detail */
  description?: ReactNode;
}

export interface FormContextValue<T extends FieldValues = FieldValues> {
  /** Current form state */
  formState: FormState;
  /** Status message for FormStatus to display */
  statusMessage: FormStatusMessage | null;
  /** Dismiss the current status message */
  dismissStatus: () => void;
  /** React Hook Form methods */
  methods: UseFormReturn<T>;
  /** Submit label (e.g. "Save", "Send") */
  submitLabel: string;
  /** Submitting label (e.g. "Saving…", "Sending…") */
  submittingLabel: string;
  /** When true, submit button is disabled until the form is dirty */
  disableWhenClean: boolean;
}

const FormContext = createContext<FormContextValue | null>(null);

/**
 * Hook to access form context. Throws if used outside a Form wrapper.
 *
 * Takes the form's values type, so `methods.getValues()` comes back typed
 * rather than as a bag of unknowns the caller has to assert.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFormContext<T extends FieldValues = FieldValues>(): FormContextValue<T> {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error("useFormContext must be used within a <Form> component");
  }
  return ctx as FormContextValue<T>;
}

export default FormContext;
