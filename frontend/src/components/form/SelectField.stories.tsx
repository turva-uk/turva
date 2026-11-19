import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import SelectField from "./SelectField";

const meta: Meta<typeof SelectField> = {
  title: "Form/Select field",
  component: SelectField,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SelectField>;

/** Control types grouped by the kind of mitigation. */
const groupedData = [
  {
    group: "Design",
    items: [
      { value: "elimination", label: "Eliminate the hazard" },
      { value: "technical", label: "Technical control" },
    ],
  },
  {
    group: "Process",
    items: [
      { value: "warning", label: "Warning or alert" },
      { value: "procedural", label: "Procedural control" },
    ],
  },
];

export const Default: Story = {
  args: {
    label: "Hazard owner",
    placeholder: "Select an owner",
    data: [
      { value: "1", label: "James Green" },
      { value: "2", label: "Sarah Mitchell" },
      { value: "3", label: "Robert Chen" },
    ],
  },
};

export const WithDescription: Story = {
  args: {
    label: "Priority",
    description: "Urgent cases are reviewed within 24 hours",
    placeholder: "Select priority",
    data: ["Low", "Medium", "High", "Urgent"],
  },
};

export const Searchable: Story = {
  args: {
    label: "Hazard owner",
    placeholder: "Search people…",
    data: [
      { value: "1", label: "James Green" },
      { value: "2", label: "Sarah Mitchell" },
      { value: "3", label: "Robert Chen" },
    ],
    searchable: true,
  },
};

export const Required: Story = {
  args: {
    label: "Priority",
    placeholder: "Select priority",
    data: ["Low", "Medium", "High", "Urgent"],
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Status",
    value: "Active",
    data: ["Active", "Inactive"],
    disabled: true,
  },
};

export const WithError: Story = {
  args: {
    label: "Priority",
    placeholder: "Select priority",
    data: ["Low", "Medium", "High", "Urgent"],
    error: "Please select a priority level",
  },
};

export const DarkMode: Story = {
  ...WithDescription,
  globals: { colorScheme: "dark" },
  render: (args) => (
    <Stack gap="xl">
      <BaseCard>
        <SelectField {...args} required />
      </BaseCard>
      <SelectField {...args} required />
      <BaseCard>
        <SelectField
          label="Priority - disabled"
          value="High"
          data={["Low", "Medium", "High", "Urgent"]}
          disabled
        />
      </BaseCard>
      <BaseCard>
        <SelectField
          label="Priority - error"
          placeholder="Select priority"
          data={["Low", "Medium", "High", "Urgent"]}
          error="Please select a priority level"
        />
      </BaseCard>
    </Stack>
  ),
};

/**
 * Groups, with the dropdown open: each heading is a divider, centred and
 * navy between two rules at the options' own size, so it cannot be
 * mistaken for an option.
 */
export const Grouped: Story = {
  args: {
    label: "Control type",
    placeholder: "Choose a control type",
    data: groupedData,
    defaultDropdownOpened: true,
    // Tall enough to show every group without scrolling. At Mantine's
    // default 250px the list scrolls, and axe flags a scroll region with
    // no focusable content (scrollable-region-focusable), though the
    // arrow keys drive it through the combobox.
    maxDropdownHeight: 400,
  },
};

/** The same in dark mode, where the heading turns pale navy. */
export const GroupedDarkMode: Story = {
  ...Grouped,
  globals: { colorScheme: "dark" },
};
