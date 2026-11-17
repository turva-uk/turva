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
  "I confirm that I have assessed this person against this competency, " +
  "that the record above reflects what I observed or reviewed, and that " +
  "I accept professional accountability for this judgement.";

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
 * How an assessor confirms a sign-off - the reason this component exists.
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
          Unticked by default and never pre-ticked: the deliberate act is the whole point, and
          the API refuses a sign-off without it. This is what NES Turas, Kaizen and the RCP
          ePortfolio do for workplace-based assessment - a drawn signature would look more
          official and prove less, since anyone can draw anyone&rsquo;s name.
        </StoryNote>
      </Stack>
    );
  },
};
