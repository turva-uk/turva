/**
 * CheckboxField Component
 *
 * Standardised checkbox wrapping Mantine's Checkbox, matching
 * `TextField`'s description and error treatment so a tick sits in a form
 * beside the other fields rather than looking borrowed.
 *
 * **This is how an attestation is confirmed**, not a setting toggled.
 * Use `SolidSwitch` for something a user flips back and forth; use this
 * where ticking is a deliberate one-time act - agreeing to a
 * declaration, confirming a statement has been read.
 *
 * Two rules follow from that and are the caller's to keep:
 *
 * - **Never pre-tick it.** A box that arrives already ticked records
 *   nothing about what the person meant to do.
 * - **Say what ticking means** in the label or description, in full, so
 *   the words being agreed to are on screen rather than implied.
 *
 * @example
 * ```tsx
 * <CheckboxField
 *   label="I confirm this declaration"
 *   description={ASSESSOR_DECLARATION_TEXT}
 *   checked={confirmed}
 *   onChange={(event) => setConfirmed(event.currentTarget.checked)}
 *   required
 * />
 * ```
 */

import { Checkbox, type CheckboxProps } from "@mantine/core";
import { ErrorMessage } from "@/components/typography";
import FieldDescription from "@/components/typography/FieldDescription";
import classes from "./CheckboxField.module.css";

export interface CheckboxFieldProps extends Omit<CheckboxProps, "description" | "error"> {
  /** Helper text below the box - where a declaration's wording belongs */
  description?: string;
  /** Validation message below the box */
  error?: string;
}

export default function CheckboxField({ description, error, ...props }: CheckboxFieldProps) {
  return (
    <Checkbox
      {...props}
      description={description ? <FieldDescription>{description}</FieldDescription> : undefined}
      error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
      size="md"
      classNames={{
        root: classes.root,
        inner: classes.inner,
        label: classes.label,
      }}
    />
  );
}
