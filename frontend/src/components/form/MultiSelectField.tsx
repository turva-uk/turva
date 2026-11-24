/**
 * MultiSelectField Component
 *
 * Standardised multi-select dropdown wrapper around Mantine's MultiSelect.
 * Displays selected values as pills and uses a chevron indicator.
 * Enforces consistent font sizing, label styling, and error display
 * across the application.
 *
 * Each pill's remove button can be reached with Tab and is named for what
 * it removes, "Remove HAZ-001" by default, or as `removeLabel` says.
 * Mantine's own pill hides that button from screen readers and from the
 * keyboard, which left Backspace in the search box as the only way to
 * remove a choice without a mouse.
 */

import {
  MultiSelect,
  Pill,
  type ComboboxItem,
  type ComboboxRenderPillInput,
  type MultiSelectProps,
} from "@mantine/core";
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

export interface MultiSelectFieldProps extends MultiSelectProps {
  /**
   * The remove button's accessible name for one choice, such as
   * `Remove HAZ-001 from linked hazards`. Defaults to "Remove" and the
   * choice's label.
   */
  removeLabel?: (option: ComboboxItem) => string;
}

export default function MultiSelectField({
  description,
  error,
  disabled,
  scrollAreaProps,
  removeLabel = (option) => `Remove ${option.label}`,
  renderPill,
  ...props
}: MultiSelectFieldProps) {
  function pill({ option, value, onRemove, reorderProps }: ComboboxRenderPillInput) {
    // A value no longer among the choices still shows, by its value.
    // Typed as always present, but Mantine passes undefined for a value
    // not among the choices.
    const known: ComboboxRenderPillInput["option"] | undefined = option;
    const item: ComboboxItem = known
      ? { value: String(known.value), label: known.label, disabled: known.disabled }
      : { value: String(value), label: String(value) };

    return (
      <Pill
        {...reorderProps}
        withRemoveButton={!props.readOnly && !disabled && !item.disabled}
        onRemove={onRemove}
        disabled={disabled}
        className={disabled ? classes.disabledPill : classes.pill}
        removeButtonProps={{
          "aria-label": removeLabel(item),
          "aria-hidden": false,
          tabIndex: 0,
        }}
      >
        {item.label}
      </Pill>
    );
  }

  return (
    <MultiSelect
      {...props}
      renderPill={renderPill ?? pill}
      // Keep the announced state consistent with the hidden read-only options.
      dropdownOpened={props.readOnly ? false : props.dropdownOpened}
      aria-readonly={props.readOnly || props["aria-readonly"]}
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
