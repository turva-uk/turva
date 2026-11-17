/**
 * PasswordField Component
 *
 * Standardised password input wrapper around Mantine's PasswordInput.
 * Includes a visibility toggle button and enforces consistent font sizing,
 * label styling, and error display across the application.
 *
 * Stops at `MAX_PASSWORD` characters, the most the backend takes, unless
 * a `maxLength` is passed.
 */

import { PasswordInput, type PasswordInputProps } from "@mantine/core";
import { ErrorMessage } from "@/components/typography";
import FieldDescription from "@/components/typography/FieldDescription";
import { MAX_PASSWORD } from "@/lib/fieldLimits";
import classes from "./PasswordField.module.css";

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
  visibilityToggle: { color: "var(--mantine-color-text)" },
};

export default function PasswordField({ description, error, ...props }: PasswordInputProps) {
  return (
    <PasswordInput
      maxLength={MAX_PASSWORD}
      {...props}
      description={description ? <FieldDescription>{description}</FieldDescription> : undefined}
      error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
      size="md"
      styles={fieldStyles}
      classNames={{ root: classes.root }}
    />
  );
}
