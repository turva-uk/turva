import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "@mantine/core";
import { ErrorMessage } from "@/components/typography";
import FieldDescription from "@/components/typography/FieldDescription";
import { MAX_EMAIL } from "@/lib/fieldLimits";
import classes from "./TextField.module.css";

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

type EmailFieldProps = Omit<TextInputProps, "type">;

/**
 * EmailField - a TextField preset for email addresses.
 *
 * Sets `type="email"` and `autoComplete="email"` automatically, and
 * stops at `MAX_EMAIL` characters, the most the backend takes.
 * Pair with `EMAIL_PATTERN` from `emailPattern.ts` in your `register`
 * call for RHF validation.
 */
const EmailField = forwardRef<HTMLInputElement, EmailFieldProps>(function EmailField(
  { description, error, ...props },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      type="email"
      autoComplete="email"
      maxLength={MAX_EMAIL}
      {...props}
      description={description ? <FieldDescription>{description}</FieldDescription> : undefined}
      error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
      size="md"
      styles={fieldStyles}
      classNames={{ root: classes.root }}
    />
  );
});

export default EmailField;
