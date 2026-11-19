/**
 * PasswordField Component
 *
 * Standardised password input wrapper around Mantine's PasswordInput.
 * Includes a visibility toggle button and enforces consistent font sizing,
 * label styling, and error display across the application.
 *
 * Never silently truncates an existing credential. The API has no matching
 * plaintext limit; the model's 128 characters store the hash, not the password.
 */

import { PasswordInput, type PasswordInputProps } from "@mantine/core";
import { ErrorMessage } from "@/components/typography";
import FieldDescription from "@/components/typography/FieldDescription";
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
      {...props}
      description={description ? <FieldDescription>{description}</FieldDescription> : undefined}
      error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
      size="md"
      styles={fieldStyles}
      classNames={{ root: classes.root }}
    />
  );
}
