/**
 * FilterSelect Component
 *
 * A filter icon button that opens a popover with a grouped
 * multi-select dropdown. Shows a count indicator when filters
 * are active. The trigger is 34px, or 44px below the sm breakpoint for
 * a finger; the icon is a fixed 32px either way.
 */

import { ActionIcon, Popover, useMantineTheme } from "@mantine/core";
import { useClickOutside, useDisclosure, useMediaQuery } from "@mantine/hooks";
import type { ComboboxParsedItemGroup } from "@mantine/core";
import { IconFilter2 } from "@/components/icons/appIcons";
import { BodyText } from "@/components/typography";
import FilterModal from "./filter/FilterModal";
import classes from "./FilterSelect.module.css";
import AppTooltip from "@/components/tooltip/AppTooltip";

interface FilterSelectProps {
  /** Grouped or flat option data - same format as MultiSelect */
  data: (string | ComboboxParsedItemGroup)[];
  /** Currently selected filter values */
  value: string[];
  /** Called when selection changes */
  onChange: (value: string[]) => void;
  /** Label shown inside the popover dropdown */
  label?: string;
  /** Placeholder text when no search term entered */
  placeholder?: string;
  /** Accessibility label for the trigger button */
  "aria-label"?: string;
}

export default function FilterSelect({
  data,
  value,
  onChange,
  label = "Filter",
  placeholder = "Select items\u2026",
  "aria-label": ariaLabel = "Filter",
}: FilterSelectProps) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`, false, {
    getInitialValueInEffect: false,
  });
  const dropdownRef = useClickOutside<HTMLDivElement>(close, ["mousedown", "touchstart"]);

  // The popover wraps the button alone, not the button and its count:
  // Popover.Target puts aria-expanded and aria-controls on its child, and
  // on a plain div those attributes are not allowed (axe
  // aria-allowed-attr) and tell a screen reader nothing.
  return (
    <div className={classes.trigger}>
      <Popover
        opened={opened}
        onClose={close}
        position="bottom-end"
        shadow="none"
        trapFocus={false}
      >
        {/* The tooltip wraps the target, not the other way round:
            Popover.Target forwards the props it is given down to the
            button, so aria-expanded still lands there, whereas a tooltip
            in the middle would keep them. */}
        <AppTooltip label={ariaLabel} position="bottom">
          <Popover.Target>
            <ActionIcon
              variant="subtle"
              size={isMobile ? 44 : "lg"}
              onClick={toggle}
              aria-label={ariaLabel}
            >
              <IconFilter2 size={32} stroke={2.5} />
            </ActionIcon>
          </Popover.Target>
        </AppTooltip>
        <Popover.Dropdown ref={dropdownRef} className={classes.dropdown}>
          <FilterModal
            data={data}
            value={value}
            onChange={onChange}
            label={label}
            placeholder={placeholder}
          />
        </Popover.Dropdown>
      </Popover>
      {value.length > 0 && (
        <span className={classes.count}>
          <BodyText>{value.length >= 10 ? "9+" : value.length}</BodyText>
        </span>
      )}
    </div>
  );
}
