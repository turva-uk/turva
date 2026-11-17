/**
 * FilterModal Component
 *
 * The dropdown panel content for FilterSelect - a grouped
 * multi-select with a reset link. Rendered inside a popover.
 */

import { Anchor, Group, Paper, Stack } from "@mantine/core";
import type { ComboboxParsedItemGroup } from "@mantine/core";
import MultiSelectField from "../MultiSelectField";
import classes from "./FilterModal.module.css";

interface FilterModalProps {
  /** Grouped or flat option data - same format as MultiSelect */
  data: (string | ComboboxParsedItemGroup)[];
  /** Currently selected filter values */
  value: string[];
  /** Called when selection changes */
  onChange: (value: string[]) => void;
  /** Label shown above the multi-select field */
  label?: string;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
}

export type { FilterModalProps };

export default function FilterModal({
  data,
  value,
  onChange,
  label = "Filter",
  placeholder = "Select items\u2026",
}: FilterModalProps) {
  return (
    <Paper shadow="md" radius="md" withBorder className={classes.panel}>
      <Stack gap="xs">
        <MultiSelectField
          data={data}
          value={value}
          onChange={onChange}
          label={label}
          placeholder={value.length === 0 ? placeholder : undefined}
          comboboxProps={{ withinPortal: false }}
        />
        {value.length > 0 && (
          <Group justify="flex-end">
            <Anchor
              component="button"
              type="button"
              size="sm"
              underline="always"
              className={classes.reset}
              onClick={() => onChange([])}
            >
              Reset
            </Anchor>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
