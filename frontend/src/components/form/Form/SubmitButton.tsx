/**
 * SubmitButton Component
 *
 * Subscribes to Form context to reflect submission state.
 * Disabled during validating/submitting to prevent double-submit.
 * Composes ButtonPair for consistent sizing, layout, and cancel-button styling.
 *
 * @example
 * ```tsx
 * // Inside a <Form> wrapper - no props needed
 * <SubmitButton />
 *
 * // With cancel button
 * <SubmitButton onCancel={() => navigate(-1)} cancelLabel="Back" />
 * ```
 */

import { Loader } from "@mantine/core";
import { useFormState } from "react-hook-form";
import ButtonPair from "@/components/button/ButtonPair";
import { useFormContext } from "./FormContext";

interface SubmitButtonProps {
  /** Cancel button handler - if provided, renders a cancel button */
  onCancel?: () => void;
  /** Cancel button label (defaults to "Cancel") */
  cancelLabel?: string;
  /** Additional disable condition - OR'd with internal checks */
  disabled?: boolean;
}

export default function SubmitButton({
  onCancel,
  cancelLabel,
  disabled = false,
}: SubmitButtonProps) {
  const {
    formState,
    submitLabel,
    submittingLabel,
    disableWhenClean,
    methods,
    submissionPending,
  } = useFormContext();

  const { isDirty, isValid } = useFormState({ control: methods.control });
  const isDisabled =
    disabled ||
    submissionPending ||
    !isValid ||
    formState === "validating" ||
    formState === "submitting" ||
    (disableWhenClean && !isDirty);
  const isLoading = formState === "submitting";

  const effectiveCancelLabel =
    cancelLabel ??
    (formState === "success" || formState === "partial_success" ? "Back" : "Cancel");

  return (
    <ButtonPair
      // 32px here, with the form's 16px gap, keeps the submit button 48px
      // below the last field, so it reads as the end of the form.
      mt="xl"
      acceptType="submit"
      acceptDisabled={isDisabled}
      cancelDisabled={
        submissionPending || formState === "validating" || formState === "submitting"
      }
      acceptTestId="submit-button"
      onCancel={onCancel}
      cancelLabel={effectiveCancelLabel}
      acceptChildren={
        <span style={{ display: "grid", placeItems: "center" }}>
          <span
            style={{
              gridArea: "1/1",
              visibility: isLoading ? "hidden" : "visible",
            }}
          >
            {submitLabel}
          </span>
          <span
            style={{
              gridArea: "1/1",
              visibility: isLoading ? "visible" : "hidden",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Loader size="xs" color="white" aria-hidden="true" />
            {submittingLabel}
          </span>
        </span>
      }
    />
  );
}
