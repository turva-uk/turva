/**
 * Search Field Component
 *
 * Collapsible search input that toggles between icon button and full
 * text input. Supports both controlled (value/onChange) and
 * uncontrolled usage. Provides animated expand/collapse with auto-focus.
 */

import { useEffect, useRef, useState } from "react";

import { ActionIcon, TextInput } from "@mantine/core";
import { IconX } from "@/components/icons/appIcons";
import SearchButton from "@/components/button/SearchButton";
import { typographyTokens } from "@/theme";
import classes from "./SearchFields.module.css";

interface SearchFieldProps {
  /** Controlled value - when provided, component is controlled */
  value?: string;
  /** Called when the search text changes */
  onChange?: (value: string) => void;
  /** Visual variant: "dark" for dark backgrounds, "light" for white/light backgrounds */
  variant?: "dark" | "light";
}

/**
 * Search Field
 *
 * Collapsible search input component:
 * - Collapsed: Shows magnifying glass icon button
 * - Expanded: Shows full text input with clear/close button
 * - Auto-focuses input when expanded
 * - Closes on blur only when empty (keeps open while search is active)
 * - Controlled: pass value/onChange to manage externally
 * - Uncontrolled: works standalone with internal state
 */
export default function SearchField({ value, onChange, variant = "dark" }: SearchFieldProps) {
  const [open, setOpen] = useState(() => !!value && value.length > 0);
  const [internalValue, setInternalValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentValue = value ?? internalValue;
  const handleChange = (newValue: string) => {
    if (value === undefined) setInternalValue(newValue);
    onChange?.(newValue);
  };

  // Auto-expand when controlled value becomes non-empty
  // (React-recommended pattern: adjust state during render)
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    if (value && value.length > 0 && !open) {
      setOpen(true);
    }
  }

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const handleClose = () => {
    handleChange("");
    setOpen(false);
  };

  const handleBlur = () => {
    // Only collapse on blur when empty
    if (currentValue.length === 0) {
      setOpen(false);
    }
  };

  return open ? (
    <TextInput
      ref={inputRef}
      size="md"
      aria-label="Search"
      placeholder={"Search\u2026"}
      value={currentValue}
      onChange={(e) => handleChange(e.currentTarget.value)}
      rightSection={
        <ActionIcon aria-label="Close search" onClick={handleClose} className={classes.close}>
          <IconX size={16} />
        </ActionIcon>
      }
      styles={{
        root: { width: 220, display: "flex", alignItems: "center" },
        input: {
          transition: "width 0.2s ease",
          width: 220,
          fontSize: "var(--mantine-font-size-md)",
          fontWeight: typographyTokens.fontWeights.body,
        },
      }}
      onBlur={handleBlur}
    />
  ) : (
    <SearchButton onClick={() => setOpen(true)} variant={variant} />
  );
}
