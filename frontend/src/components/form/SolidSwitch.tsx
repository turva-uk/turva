/**
 * Solid Switch Component
 *
 * A Mantine Switch wrapper with a solid thumb (no inner ring/hole).
 * Renders an optional top label, a switch with automatic "No"/"Yes"
 * inline text, and an optional description below. At size xl the
 * tap target is padded to 44px tall for touch screens, and xl is the
 * default below the sm breakpoint (md above it) unless a size is passed.
 */

import {
  Input,
  Switch,
  useComputedColorScheme,
  useMantineTheme,
  type SwitchProps,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useState } from "react";
import type { ReactNode } from "react";
import { FieldDescription, ErrorMessage } from "@/components/typography";
import classes from "./SolidSwitch.module.css";

interface SolidSwitchProps extends Omit<SwitchProps, "label" | "description"> {
  /** Label displayed above the switch (matches form field style) */
  label?: string;
  /** Helper text displayed below the switch */
  description?: string;
  /** Error message displayed below the switch */
  error?: string;
  /** Text shown when switch is on (default: "Yes") */
  onLabel?: string;
  /** Text shown when switch is off (default: "No") */
  offLabel?: string;
}

export default function SolidSwitch({
  label,
  description,
  error,
  checked: controlledChecked,
  onChange,
  classNames,
  size: sizeProp,
  onLabel = "Yes",
  offLabel = "No",
  ...rest
}: SolidSwitchProps) {
  const isControlled = controlledChecked !== undefined;
  const [internalChecked, setInternalChecked] = useState(false);
  const checked = isControlled ? controlledChecked : internalChecked;
  const isDark = useComputedColorScheme("light") === "dark";
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const size = sizeProp ?? (isMobile ? "xl" : "md");

  const stableLabel: ReactNode = (
    <span style={{ display: "inline-grid" }}>
      <span style={{ gridArea: "1/1", visibility: checked ? "visible" : "hidden" }}>
        {onLabel}
      </span>
      <span style={{ gridArea: "1/1", visibility: checked ? "hidden" : "visible" }}>
        {offLabel}
      </span>
    </span>
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isControlled) {
      setInternalChecked(e.currentTarget.checked);
    }
    onChange?.(e);
  }

  return (
    <div>
      {label && <Input.Label className={classes.topLabel}>{label}</Input.Label>}
      {description && <FieldDescription>{description}</FieldDescription>}
      <Switch
        {...rest}
        checked={checked}
        onChange={handleChange}
        size={size}
        label={stableLabel}
        classNames={{
          root: classes.root,
          body: size === "xl" ? classes.bodyXl : undefined,
          thumb: classes.thumb,
          track: classes.track,
          ...classNames,
        }}
        styles={{
          label: {
            fontSize: "var(--mantine-font-size-md)",
            fontWeight: 500,
            color: "var(--mantine-color-text)",
          },
          track: isDark
            ? {
                backgroundColor: checked
                  ? "var(--mantine-color-primary-9)"
                  : "var(--mantine-color-primary-5)",
                borderColor: checked
                  ? "var(--mantine-color-primary-9)"
                  : "var(--mantine-color-primary-5)",
              }
            : undefined,
        }}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
}
