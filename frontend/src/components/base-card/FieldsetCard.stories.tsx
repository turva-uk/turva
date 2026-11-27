/**
 * FieldsetCard Component Stories
 *
 * A card that groups related controls under a name, with the name as a
 * bold title inside it and a real fieldset underneath for screen readers.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";

import { CheckboxField } from "@/components/form";
import FieldsetCard from "./FieldsetCard";

const meta: Meta<typeof FieldsetCard> = {
  title: "Cards/Fieldset card",
  component: FieldsetCard,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof FieldsetCard>;

/** One person's roles, as on an organisation's page. */
export const Default: Story = {
  render: () => (
    <FieldsetCard legend="Dr Anita Patel" description="a.patel@riverbank.example.nhs.uk">
      <CheckboxField label="Membership active" defaultChecked />
      <CheckboxField label="Organisation administrator" defaultChecked />
      <CheckboxField
        label="Appointed Clinical Safety Officer"
        description="The person must first complete their own profile declaration."
      />
    </FieldsetCard>
  ),
};

/** A group with a title and no description line. */
export const WithoutDescription: Story = {
  render: () => (
    <FieldsetCard legend="Notifications">
      <CheckboxField label="Email me when a hazard I review changes" defaultChecked />
      <CheckboxField label="Email me a weekly summary" />
    </FieldsetCard>
  ),
};
