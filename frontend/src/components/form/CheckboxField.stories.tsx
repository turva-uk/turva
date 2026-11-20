import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import { useState } from "react";
import CheckboxField from "./CheckboxField";
import { StoryNote } from "@/stories/variants";

const meta: Meta<typeof CheckboxField> = {
  title: "Form/Checkbox field",
  component: CheckboxField,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof CheckboxField>;

const DECLARATION =
  "I confirm that I have reviewed the evidence shown above and recorded " +
  "the reasons for this draft assessment. This acknowledgement does not " +
  "approve deployment or verify my competence.";

export const Default: Story = {
  args: {
    label: "I confirm this declaration",
  },
};

export const WithDescription: Story = {
  args: {
    label: "I confirm this declaration",
    description: "The wording being agreed to belongs on screen, in full.",
  },
};

export const Required: Story = {
  args: {
    label: "I confirm this declaration",
    required: true,
  },
};

export const WithError: Story = {
  args: {
    label: "I confirm this declaration",
    error: "You must confirm the declaration before signing",
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "I confirm this declaration",
    checked: true,
    disabled: true,
  },
};

/**
 * A deliberate acknowledgement, distinct from clinical approval.
 */
export const AsAnAttestation: Story = {
  render: function AsAnAttestationStory() {
    const [confirmed, setConfirmed] = useState(false);

    return (
      <Stack gap="sm" maw="40rem">
        <CheckboxField
          label="I confirm this declaration"
          description={DECLARATION}
          checked={confirmed}
          onChange={(event) => setConfirmed(event.currentTarget.checked)}
          required
        />
        <StoryNote>
          Illustrative wording only. The box starts unticked. A deliberate tick records an
          acknowledgement; it does not verify competence or approve a safety case.
        </StoryNote>
      </Stack>
    );
  },
};
