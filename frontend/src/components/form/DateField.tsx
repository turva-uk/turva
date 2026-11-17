/**
 * DateField Component
 *
 * Standardised date input wrapping Mantine's DateInput, matching
 * `TextField`'s label styling, description and error treatment so a date
 * sits in a form beside the other fields without looking borrowed.
 *
 * **Values are `YYYY-MM-DD` strings, never `Date` objects.** Mantine 9's
 * DateInput works in strings natively, and so does every date the backend
 * sends or accepts - `observed_on`, `performed_on`, `awarded_on`. Passing
 * `Date` through would mean parsing and re-serialising at both ends,
 * which is where a timezone silently shifts a clinical date by a day.
 *
 * A date here carries no time of day, deliberately. Nobody recalls
 * whether a procedure was at 09:30 or 11:00 when logging five of them on
 * a Friday evening.
 *
 * @example
 * ```tsx
 * <DateField
 *   label="Observed on"
 *   value={observedOn}
 *   onChange={setObservedOn}
 *   maxDate={today}
 *   required
 * />
 * ```
 */

import { DateInput, type DateInputProps } from "@mantine/dates";
import { ErrorMessage } from "@/components/typography";
import FieldDescription from "@/components/typography/FieldDescription";
import classes from "./DateField.module.css";

const fieldStyles = {
  label: {
    fontSize: "var(--mantine-font-size-md)",
    color: "var(--mantine-color-text)",
    marginBottom: "0.25rem",
  },
  input: {
    fontSize: "var(--mantine-font-size-md)",
    fontWeight: 500,
    "&::placeholder": { color: "var(--mantine-color-placeholder)" },
  },
  required: { color: "var(--mantine-color-secondary-5)" },
};

export default function DateField({
  description,
  error,
  valueFormat = "D MMMM YYYY",
  placeholder = "DD/MM/YYYY",
  clearButtonProps,
  ...props
}: DateInputProps) {
  return (
    <DateInput
      {...props}
      // British reading order, matching the rest of the interface.
      valueFormat={valueFormat}
      placeholder={placeholder}
      // Mantine's clear button is an icon with no name, so a screen
      // reader announces only "button".
      clearButtonProps={{ "aria-label": "Clear date", ...clearButtonProps }}
      description={description ? <FieldDescription>{description}</FieldDescription> : undefined}
      error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
      size="md"
      styles={fieldStyles}
      classNames={{ root: classes.root }}
    />
  );
}
