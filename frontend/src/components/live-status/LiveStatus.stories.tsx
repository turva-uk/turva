import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoryNote } from "@/stories/variants";
import LiveStatus from "./LiveStatus";

const meta: Meta<typeof LiveStatus> = {
  title: "Feedback/Live status",
  component: LiveStatus,
  parameters: { layout: "padded" },
  args: { message: "Loading" },
};
export default meta;

type Story = StoryObj<typeof LiveStatus>;

/** Invisible by design: it speaks to screen readers only. */
export const Default: Story = {
  render: (args) => (
    <>
      <LiveStatus {...args} />
      <StoryNote>
        Nothing to see: this region is visually hidden. A screen reader announces &quot;
        {args.message}&quot;.
      </StoryNote>
    </>
  ),
};
