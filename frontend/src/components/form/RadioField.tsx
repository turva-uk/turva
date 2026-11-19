/**
 * RadioField Component
 *
 * Atomic radio group component for form selections. Wraps Mantine's
 * Radio.Group with consistent sizing, label styling, and dark-mode
 * compatible colours from the design system.
 */

import { Radio, Stack } from "@mantine/core";
import { ErrorMessage } from "@/components/typography";
import FieldDescription from "@/components/typography/FieldDescription";
import classes from "./RadioField.module.css";

interface RadioOption {
  /** Unique value for this option */
  value: string;
  /** Display label */
  label: string;
}

interface RadioFieldProps {
  /** Field label displayed above the radio group */
  label?: string;
  /** Available options */
  options: RadioOption[];
  /** Currently selected value (controlled) */
  value: string | null;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Optional description below the label */
  description?: string;
  /** Error message displayed below the radio group */
  error?: string;
}

const fieldStyles = {
  label: {
    fontSize: "var(--mantine-font-size-md)",
    color: "var(--mantine-color-text)",
    marginBottom: "0.25rem",
  },
};

const radioStyles = {
  label: {
    fontSize: "var(--mantine-font-size-md)",
    fontWeight: 500,
    color: "var(--mantine-color-text)",
  },
  icon: {
    color: "var(--mantine-color-secondary-5)",
  },
};

/**
 * RadioField renders a labelled group of radio buttons with consistent
 * sizing and dark-mode support.
 */
export default function RadioField({
  label,
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  description,
  error,
}: RadioFieldProps) {
  return (
    <Radio.Group
      label={label}
      value={value ?? ""}
      onChange={onChange}
      required={required}
      description={description ? <FieldDescription>{description}</FieldDescription> : undefined}
      error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
      styles={fieldStyles}
    >
      <Stack gap="sm" mt={label ? "xs" : undefined}>
        {options.map((opt) => (
          <div key={opt.value} className={classes.option} data-disabled={disabled || undefined}>
            <Radio
              value={opt.value}
              label={opt.label}
              disabled={disabled}
              styles={radioStyles}
              classNames={{
                radio: classes.radio,
                inner: classes.inner,
                label: classes.label,
              }}
            />
          </div>
        ))}
      </Stack>
    </Radio.Group>
  );
}

export type { RadioOption, RadioFieldProps };
