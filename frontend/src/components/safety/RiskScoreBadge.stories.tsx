/**
 * RiskScoreBadge Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import RiskScoreBadge from "./RiskScoreBadge";
import { StoryNote, VariantRow, VariantStack } from "@/stories/variants";
import { assessment } from "@/test/safetyFile";

const meta: Meta<typeof RiskScoreBadge> = {
  title: "Safety/Risk score badge",
  component: RiskScoreBadge,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <VariantStack>
        <Story />
        <StoryNote>
          Fictional assessment values, checked against the server's matrix. A displayed level is
          not clinical approval.
        </StoryNote>
      </VariantStack>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RiskScoreBadge>;

export const Default: Story = {
  args: { assessment: assessment(4, 3) },
};

export const AllLevels: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="1 and 2: acceptable">
        <RiskScoreBadge assessment={assessment(1, 1)} />
        <RiskScoreBadge assessment={assessment(4, 1)} />
      </VariantRow>
      <VariantRow label="3: undesirable">
        <RiskScoreBadge assessment={assessment(3, 3)} />
      </VariantRow>
      <VariantRow label="4 and 5: reduce before go-live">
        <RiskScoreBadge assessment={assessment(4, 3)} />
        <RiskScoreBadge assessment={assessment(5, 5)} />
      </VariantRow>
    </VariantStack>
  ),
};

/** The number alone, as the hazard log shows it; hover for the words. */
export const Compact: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="Compact: 1, 3 and 5">
        <RiskScoreBadge assessment={assessment(1, 1)} compact />
        <RiskScoreBadge assessment={assessment(3, 3)} compact />
        <RiskScoreBadge assessment={assessment(5, 5)} compact />
      </VariantRow>
    </VariantStack>
  ),
};

/** With the scores in front, as the hazard log shows them: "S4 L3", then the level. */
export const WithScores: Story = {
  render: () => (
    <VariantStack>
      <RiskScoreBadge assessment={assessment(4, 3)} withScores />
      <RiskScoreBadge assessment={assessment(4, 1)} withScores />
    </VariantStack>
  ),
};

export const DarkMode: Story = {
  ...AllLevels,
  globals: { colorScheme: "dark" },
};

export const CompactDarkMode: Story = {
  ...Compact,
  globals: { colorScheme: "dark" },
};

export const CompactKeyboardLabel: Story = {
  args: { assessment: assessment(4, 1), compact: true },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(
      within(canvasElement).getByRole("img", { name: /^Risk level 2/ }),
    ).toHaveFocus();
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole("tooltip"),
    ).toHaveTextContent("Acceptable if cost of reduction exceeds benefit");
  },
};

export const UnsupportedAssessment: Story = {
  args: { assessment: { ...assessment(4, 1), risk_level: 0 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("Risk assessment unavailable");
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};
