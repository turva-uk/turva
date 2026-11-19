/**
 * MultiSelectField Component
 *
 * Standardised multi-select dropdown wrapper around Mantine's MultiSelect.
 * Displays selected values as pills and uses a chevron indicator.
 * Enforces consistent font sizing, label styling, and error display
 * across the application.
 */

import { MultiSelect, type MultiSelectProps } from "@mantine/core";
import { ErrorMessage } from "@/components/typography";
import FieldDescription from "@/components/typography/FieldDescription";
import SortChevron from "@/components/sort/SortChevron";
import classes from "./MultiSelectField.module.css";
import dropdownClasses from "./dropdownGroupLabel.module.css";
import { dropdownScrollArea } from "./dropdownScrollArea";

const fieldStyles = {
  label: {
    fontSize: "var(--mantine-font-size-md)",
    color: "var(--mantine-color-text)",
    marginBottom: "0.25rem",
  },
  required: { color: "var(--mantine-color-secondary-5)" },
};

export default function MultiSelectField({
  description,
  error,
  disabled,
  scrollAreaProps,
  ...props
}: MultiSelectProps) {
  return (
    <MultiSelect
      {...props}
      disabled={disabled}
      scrollAreaProps={dropdownScrollArea(scrollAreaProps)}
      rightSection={<SortChevron direction="neutral" />}
      description={description ? <FieldDescription>{description}</FieldDescription> : undefined}
      error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
      size="md"
      styles={fieldStyles}
      classNames={{
        root: classes.root,
        input: classes.input,
        pillsList: classes.pillsList,
        inputField: classes.inputField,
        pill: disabled ? classes.disabledPill : classes.pill,
        option: classes.option,
        groupLabel: dropdownClasses.groupLabel,
      }}
    />
  );
}
