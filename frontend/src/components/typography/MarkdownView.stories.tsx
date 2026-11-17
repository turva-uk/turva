/**
 * MarkdownView Component Stories
 *
 * Demonstrates the markdown rendering component styled to match
 * our typography system:
 * - Rich text formatting (bold, italic, lists, links)
 * - Code blocks
 * - Safe HTML rendering (XSS protection via DOMPurify)
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconPencil, IconUserPlus } from "@/components/icons/appIcons";
import MarkdownView from "./MarkdownView";

const meta: Meta<typeof MarkdownView> = {
  title: "Foundations/Typography/Markdown view",
  component: MarkdownView,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof MarkdownView>;

// Build the sample string from an array of lines so code-fence lines are safe
// and don't appear raw inside the file editing surface.
const sampleLines = [
  "# Heading 1",
  "",
  "This is a paragraph with **bold** and *italic* text, plus a [link](https://example.com).",
  "",
  "- Item one",
  "- Item two",
  "",
  "1. First",
  "2. Second",
  "",
  "`inline code`",
  "",
  "```",
  "code block",
  "line 2",
  "```",
];

const sample = sampleLines.join("\n");

/**
 * Default
 *
 * Renders formatted markdown with headings, bold, italic, lists,
 * links and code blocks.
 */
export const Default: Story = {
  args: {
    source: sample,
  },
};

/**
 * Plain Text
 *
 * Shows the raw markdown source as plain text with tags stripped.
 */
export const PlainText: Story = {
  args: {
    source: sample,
    asPlainText: true,
  },
};

/**
 * Loading
 *
 * Shows skeleton placeholders while markdown content is loading.
 */
export const Loading: Story = {
  args: {
    source: sample,
    isLoading: true,
  },
};

/**
 * Wrapped list items
 *
 * Long items written over two lines, the second indented, as Markdown
 * allows. Each stays one bullet rather than ending the list.
 */
export const WrappedListItems: Story = {
  args: {
    source: [
      "**The assessment** puts that into practice:",
      "",
      "- Press **Finish** to go back to the module page, where the assessment",
      "  starts.",
      "- Each question shows a polyp twice: once under white light and once",
      "  under narrow band imaging.",
      "- When you pass, your certificate is emailed to you.",
    ].join("\n"),
  },
};

/**
 * With images
 *
 * Images are off unless the caller gives an `imageBase`, as a guide does.
 * The first step's image loads; the second's does not exist, so its alt
 * text is shown in its place.
 */
export const WithImages: Story = {
  args: {
    imageBase: ".",
    source: [
      "## Find the logo",
      "",
      "1. Look at the top of the page.",
      "   ![The Brand logo](brands/turva/logo.svg)",
      "2. Look for a picture that is not there.",
      "   ![A screenshot that has not been taken yet](missing/shot.png)",
      "3. Carry on.",
    ].join("\n"),
  },
};

/**
 * Icons are off unless the caller gives them, as a guide does. A step
 * names one as `:icon-user-plus:`, and it is shown in the line.
 */
export const WithIcons: Story = {
  args: {
    icons: { "user-plus": <IconUserPlus /> },
    source: [
      "## Add somebody",
      "",
      "1. Press the **Add user** button :icon-user-plus:, above the list.",
      "2. Fill in their details and press **Save**.",
    ].join("\n"),
  },
};

/**
 * `:button-pencil:` draws the icon in the filled square an icon-only
 * button has on the page, for a step whose button looks like that.
 */
export const WithButtonIcons: Story = {
  args: {
    icons: { pencil: <IconPencil /> },
    source: [
      "## Edit a site",
      "",
      "1. Open the site from **Sites**.",
      "2. Press the **Edit site** button :button-pencil:, beside its name.",
    ].join("\n"),
  },
};

export const DarkMode: Story = {
  ...Default,
  globals: { colorScheme: "dark" },
};
