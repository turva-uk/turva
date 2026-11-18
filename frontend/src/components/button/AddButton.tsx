/**
 * AddButton Component
 *
 * A consistent button component for "Add" actions across the application.
 * Enforces uniform styling, sizing, and color scheme (blue) for all
 * create/add operations.
 *
 * @example
 * ```tsx
 * <AddButton label="Add user" onClick={() => navigate("/users/new")} />
 * <AddButton label="Add hazard" onClick={handleAddHazard} disabled={loading} />
 * ```
 */

import { Button } from "@mantine/core";
import { IconPlus } from "@/components/icons/appIcons";
import classes from "./AddButton.module.css";

interface AddButtonProps {
  /** Button label text (e.g. "Add hazard", "Add mitigation") */
  label: string;
  /** Click handler */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * AddButton displays a consistent blue button for add/create actions.
 *
 * Features:
 * - Large size (lg) for prominence
 * - Large font size for text
 * - Medium-sized plus icon
 * - Blue color scheme (consistent across all add actions)
 * - Disabled state
 *
 * Used for creating new hazards, mitigations and other records.
 */
export default function AddButton({ label, onClick, disabled = false }: AddButtonProps) {
  return (
    <Button
      leftSection={<IconPlus size={20} />}
      onClick={disabled ? (e: React.MouseEvent) => e.preventDefault() : onClick}
      size="md"
      color="primary"
      aria-disabled={disabled || undefined}
      classNames={{ root: classes.root }}
      styles={{
        root: disabled ? { opacity: 0.6, cursor: "default" } : undefined,
      }}
    >
      {label}
    </Button>
  );
}
