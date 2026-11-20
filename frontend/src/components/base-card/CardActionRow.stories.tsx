/**
 * CardActionRow Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Container } from "@mantine/core";
import { fn } from "storybook/test";
import BaseCard from "./BaseCard";
import CardActionRow from "./CardActionRow";
import IconButton from "@/components/button/IconButton";
import { IconPencil } from "@/components/icons/appIcons";
import { BodyText, BodyTextBold } from "@/components/typography";
import { StoryNote } from "@/stories/variants";

const meta: Meta<typeof CardActionRow> = {
  title: "Cards/Card action row",
  component: CardActionRow,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof CardActionRow>;

const text = (
  <>
    <BodyTextBold>Clinical safety officer</BodyTextBold>
    <BodyText>Dr Hannah Okafor</BodyText>
    <BodyText c="dimmed">hannah.okafor@example.org</BodyText>
  </>
);

const edit = (
  <IconButton
    icon={<IconPencil />}
    variant="subtle"
    color="primary"
    aria-label="Edit clinical safety officer"
    onClick={fn()}
  />
);

export const Default: Story = {
  render: () => (
    <BaseCard>
      <CardActionRow action={edit}>{text}</CardActionRow>
    </BaseCard>
  ),
};

export const WithoutAnAction: Story = {
  render: () => (
    <BaseCard>
      <CardActionRow>{text}</CardActionRow>
    </BaseCard>
  ),
};

/**
 * A card about 18rem wide, as one of two sharing a 40rem row. The
 * email breaks rather than pushing the icon out of the card.
 */
export const Narrow: Story = {
  render: () => (
    <div>
      <Container size={18 * 16} px={0}>
        <BaseCard>
          <CardActionRow action={edit}>{text}</CardActionRow>
        </BaseCard>
      </Container>
      <StoryNote mt="xs">Constrained to 18rem width</StoryNote>
    </div>
  ),
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
