/**
 * SelectField Component
 *
 * Standardised dropdown select wrapper around Mantine's Select.
 * Enforces consistent font sizing, label styling, and error display
 * across the application.
 */

import { Select, type SelectProps } from "@mantine/core";
import { ErrorMessage } from "@/components/typography";
import FieldDescription from "@/components/typography/FieldDescription";
import classes from "./SelectField.module.css";
import dropdownClasses from "./dropdownGroupLabel.module.css";

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
  option: {
    fontWeight: 500,
  },
  required: { color: "var(--mantine-color-secondary-5)" },
};

export default function SelectField({ description, error, ...props }: SelectProps) {
  return (
    <Select
      {...props}
      description={description ? <FieldDescription>{description}</FieldDescription> : undefined}
      error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
      size="md"
      styles={fieldStyles}
      classNames={{
        root: classes.root,
        section: classes.section,
        groupLabel: dropdownClasses.groupLabel,
      }}
    />
  );
}
