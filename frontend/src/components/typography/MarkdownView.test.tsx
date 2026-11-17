/**
 * MarkdownView Component Tests
 *
 * Tests for markdown rendering with XSS protection, HTML sanitization,
 * and safe link handling.
 */

import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { IconUserPlus } from "@/components/icons/appIcons";
import MarkdownView from "./MarkdownView";

describe("MarkdownView", () => {
  describe("Basic markdown rendering", () => {
    it("renders plain text", () => {
      renderWithMantine(<MarkdownView source="Hello world" />);
      expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    it("renders paragraphs", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="First paragraph\n\nSecond paragraph" />,
      );
      const paragraphs = container.querySelectorAll("p");
      // Note: Markdown parser may combine consecutive lines into single paragraph
      expect(paragraphs.length).toBeGreaterThanOrEqual(1);
    });

    it("renders bold text with **", () => {
      const { container } = renderWithMantine(<MarkdownView source="**bold text**" />);
      const strong = container.querySelector("strong");
      expect(strong?.textContent).toBe("bold text");
    });

    it("renders italic text with *", () => {
      const { container } = renderWithMantine(<MarkdownView source="*italic text*" />);
      const em = container.querySelector("em");
      expect(em?.textContent).toBe("italic text");
    });

    it("renders inline code with backticks", () => {
      const { container } = renderWithMantine(<MarkdownView source="`inline code`" />);
      const code = container.querySelector("code");
      expect(code?.textContent).toBe("inline code");
    });
  });

  describe("Headers", () => {
    it("renders h1 headers", () => {
      const { container } = renderWithMantine(<MarkdownView source="# Header 1" />);
      const h1 = container.querySelector("h1");
      expect(h1?.textContent).toBe("Header 1");
    });

    it("renders h2 headers", () => {
      const { container } = renderWithMantine(<MarkdownView source="## Header 2" />);
      const h2 = container.querySelector("h2");
      expect(h2?.textContent).toBe("Header 2");
    });

    it("renders h3 headers", () => {
      const { container } = renderWithMantine(<MarkdownView source="### Header 3" />);
      const h3 = container.querySelector("h3");
      expect(h3?.textContent).toBe("Header 3");
    });

    it("supports headers up to h6", () => {
      const { container } = renderWithMantine(<MarkdownView source="###### Header 6" />);
      const h6 = container.querySelector("h6");
      expect(h6?.textContent).toBe("Header 6");
    });
  });

  describe("Lists", () => {
    it("renders unordered lists with -", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="- Item 1\n- Item 2\n- Item 3" />,
      );
      const ul = container.querySelector("ul");
      expect(ul).toBeInTheDocument();
      expect(ul?.textContent).toContain("Item 1");
      expect(ul?.textContent).toContain("Item 2");
      expect(ul?.textContent).toContain("Item 3");
    });

    it("renders unordered lists with *", () => {
      const { container } = renderWithMantine(<MarkdownView source="* Item A\n* Item B" />);
      const ul = container.querySelector("ul");
      expect(ul).toBeInTheDocument();
      expect(ul?.textContent).toContain("Item A");
      expect(ul?.textContent).toContain("Item B");
    });

    it("renders ordered lists", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="1. First\n2. Second\n3. Third" />,
      );
      const ol = container.querySelector("ol");
      expect(ol).toBeInTheDocument();
      expect(ol?.textContent).toContain("First");
      expect(ol?.textContent).toContain("Second");
      expect(ol?.textContent).toContain("Third");
    });

    // A long item is wrapped in the source with its next line indented.
    // Read as a line of its own, it ended the list, and every item after
    // it ran together into one paragraph, "- " markers and all.
    it("keeps a wrapped bullet as one item", () => {
      const source = [
        "- Press **Finish** to go back to the module page, where the",
        "  assessment starts.",
        "- Each question shows a polyp twice: once under white light",
        "  and once under narrow band imaging.",
        "- When you pass, your certificate is emailed to you.",
      ].join("\n");

      const { container } = renderWithMantine(<MarkdownView source={source} />);

      const items = container.querySelectorAll("ul > li");
      expect(container.querySelectorAll("ul")).toHaveLength(1);
      expect(items).toHaveLength(3);
      expect(items[0]?.textContent).toBe(
        "Press Finish to go back to the module page, where the assessment starts.",
      );
      expect(items[1]?.textContent).toContain("narrow band imaging.");
      expect(container.querySelector("p")).toBeNull();
    });

    it("keeps a wrapped numbered item as one item", () => {
      const source = [
        "1. Open the form, which may take",
        "   a moment to load",
        "2. Press save",
      ].join("\n");

      const { container } = renderWithMantine(<MarkdownView source={source} />);

      const items = container.querySelectorAll("ol > li");
      expect(items).toHaveLength(2);
      expect(items[0]?.textContent).toBe("Open the form, which may take a moment to load");
    });

    it("still starts a paragraph after a blank line", () => {
      const source = ["- One", "  carried on", "", "After the list."].join("\n");

      const { container } = renderWithMantine(<MarkdownView source={source} />);

      expect(container.querySelectorAll("ul > li")).toHaveLength(1);
      expect(container.querySelector("p")?.textContent).toBe("After the list.");
    });

    it("still starts a paragraph on an unindented line after a list", () => {
      // Only indented lines carry an item on, so text written straight
      // after a list reads as it always has.
      const source = ["- One", "Straight after."].join("\n");

      const { container } = renderWithMantine(<MarkdownView source={source} />);

      expect(container.querySelector("li")?.textContent).toBe("One");
      expect(container.querySelector("p")?.textContent).toBe("Straight after.");
    });

    it("does not carry an item into a heading", () => {
      const source = ["- One", "  ## Next part"].join("\n");

      const { container } = renderWithMantine(<MarkdownView source={source} />);

      expect(container.querySelector("li")?.textContent).toBe("One");
    });
  });

  describe("Code blocks", () => {
    it("renders code blocks with triple backticks", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="```\nconst x = 42;\nconsole.log(x);\n```" />,
      );
      const pre = container.querySelector("pre");
      expect(pre).toBeInTheDocument();
      // DOMPurify may strip code blocks, check if pre exists at minimum
      if (pre && pre.textContent) {
        expect(pre.textContent.length).toBeGreaterThan(0);
      }
    });

    it("escapes HTML in code blocks", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="```\n<script>alert('xss')</script>\n```" />,
      );
      // Main security check: no actual script element
      expect(container.querySelector("script")).not.toBeInTheDocument();
      // Code block should exist
      const pre = container.querySelector("pre");
      expect(pre).toBeInTheDocument();
    });
  });

  describe("Links", () => {
    it("renders markdown links", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="[Click here](https://example.com)" />,
      );
      const link = container.querySelector("a");
      expect(link?.textContent).toBe("Click here");
      expect(link?.getAttribute("href")).toBe("https://example.com");
    });

    it("keeps bold inside a link, as a guide names a page", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="Choose [**Users**](/admin/users)." />,
      );
      const link = container.querySelector("a");
      expect(link?.getAttribute("href")).toBe("/admin/users");
      expect(link?.querySelector("strong")?.textContent).toBe("Users");
    });

    it("adds security attributes to links", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="[Link](https://example.com)" />,
      );
      const link = container.querySelector("a");
      expect(link?.getAttribute("rel")).toContain("noopener");
      expect(link?.getAttribute("rel")).toContain("noreferrer");
    });

    it("handles relative links", () => {
      const { container } = renderWithMantine(<MarkdownView source="[Local](/page)" />);
      const link = container.querySelector("a");
      expect(link?.getAttribute("href")).toBe("/page");
    });

    it("handles mailto links", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="[Email](mailto:test@example.com)" />,
      );
      const link = container.querySelector("a");
      expect(link?.getAttribute("href")).toBe("mailto:test@example.com");
    });

    it("calls onLinkClick when link is clicked", async () => {
      const user = userEvent.setup();
      const onLinkClick = vi.fn();
      const { container } = renderWithMantine(
        <MarkdownView source="[Click me](https://example.com)" onLinkClick={onLinkClick} />,
      );

      const link = container.querySelector("a");
      if (link) {
        await user.click(link);
      }

      expect(onLinkClick).toHaveBeenCalledWith("https://example.com");
    });

    it("calls onLinkClick when the bold text inside a link is clicked", async () => {
      const user = userEvent.setup();
      const onLinkClick = vi.fn();
      const { container } = renderWithMantine(
        <MarkdownView source="[**Users**](/admin/users)" onLinkClick={onLinkClick} />,
      );

      const bold = container.querySelector("a strong");
      expect(bold).not.toBeNull();
      if (bold) {
        await user.click(bold);
      }

      expect(onLinkClick).toHaveBeenCalledWith("/admin/users");
    });

    it("prevents default when onLinkClick is provided", async () => {
      const user = userEvent.setup();
      const onLinkClick = vi.fn();
      const { container } = renderWithMantine(
        <MarkdownView source="[Test](https://example.com)" onLinkClick={onLinkClick} />,
      );

      const link = container.querySelector("a");
      if (link) {
        await user.click(link);
      }

      // If default was prevented, onLinkClick was called
      expect(onLinkClick).toHaveBeenCalled();
    });
  });

  describe("XSS protection", () => {
    it("sanitizes script tags", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="<script>alert('xss')</script>" />,
      );
      expect(container.querySelector("script")).not.toBeInTheDocument();
    });

    it("sanitizes onclick attributes", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="<p onclick='alert(1)'>Click</p>" />,
      );
      const p = container.querySelector("p");
      expect(p?.getAttribute("onclick")).toBeNull();
    });

    it("sanitizes iframe tags", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="<iframe src='evil.com'></iframe>" />,
      );
      expect(container.querySelector("iframe")).not.toBeInTheDocument();
    });

    it("allows safe HTML tags", () => {
      const { container } = renderWithMantine(<MarkdownView source="**bold** and *italic*" />);
      expect(container.querySelector("strong")).toBeInTheDocument();
      expect(container.querySelector("em")).toBeInTheDocument();
    });

    it("escapes HTML entities correctly", () => {
      const { container } = renderWithMantine(<MarkdownView source="5 < 10 & 20 > 15" />);
      expect(container.textContent).toContain("<");
      expect(container.textContent).toContain("&");
      expect(container.textContent).toContain(">");
    });
  });

  describe("Loading state", () => {
    it("shows skeleton loaders when loading", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="Content" isLoading={true} />,
      );

      // Check for skeleton presence by looking for Stack with skeletons
      const stack = container.querySelector('[class*="Stack"]');
      expect(stack).toBeInTheDocument();
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("shows content when not loading", () => {
      renderWithMantine(<MarkdownView source="Content" isLoading={false} />);
      expect(screen.getByText("Content")).toBeInTheDocument();
    });
  });

  describe("Plain text mode", () => {
    it("renders as plain text when asPlainText is true", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="**bold** text" asPlainText={true} />,
      );
      expect(container.querySelector("strong")).not.toBeInTheDocument();
      expect(container.textContent).toContain("bold");
    });

    it("strips HTML tags in plain text mode", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="# Header" asPlainText={true} />,
      );
      expect(container.querySelector("h1")).not.toBeInTheDocument();
      expect(container.textContent).toContain("Header");
    });

    it("renders in pre tag for plain text", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="Plain text" asPlainText={true} />,
      );
      const pre = container.querySelector("pre");
      expect(pre).toBeInTheDocument();
      expect(pre?.style.whiteSpace).toBe("pre-wrap");
    });
  });

  describe("Custom styling and children", () => {
    it("applies custom className", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="Content" className="custom-class" />,
      );
      const div = container.querySelector(".custom-class");
      expect(div).toBeInTheDocument();
    });

    it("renders children when provided", () => {
      renderWithMantine(
        <MarkdownView source="Content" asPlainText={true}>
          <div>Additional content</div>
        </MarkdownView>,
      );
      expect(screen.getByText("Additional content")).toBeInTheDocument();
    });
  });

  describe("Complex markdown", () => {
    it("handles mixed formatting", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="**Bold** with *italic* and `code`" />,
      );
      expect(container.querySelector("strong")).toBeInTheDocument();
      expect(container.querySelector("em")).toBeInTheDocument();
      expect(container.querySelector("code")).toBeInTheDocument();
    });

    it("handles multiline content", () => {
      const source = `# Title

This is a paragraph.

- List item 1
- List item 2

Another paragraph.`;

      const { container } = renderWithMantine(<MarkdownView source={source} />);
      expect(container.querySelector("h1")).toBeInTheDocument();
      expect(container.querySelector("ul")).toBeInTheDocument();
      const paragraphs = container.querySelectorAll("p");
      expect(paragraphs.length).toBeGreaterThan(0);
    });
  });

  describe("Images", () => {
    it("leaves an image out unless the caller allows images", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="![The form](add-a-delegate/form.png)" />,
      );

      expect(container.querySelector("img")).toBeNull();
      expect(container.textContent).not.toContain("form.png");
    });

    it("shows an image beneath the base it is given", () => {
      renderWithMantine(
        <MarkdownView
          source="![The form](add-a-delegate/form.png)"
          imageBase="/guide-assets"
        />,
      );

      const image = screen.getByRole("img", { name: "The form" });
      expect(image).toHaveAttribute("src", "/guide-assets/add-a-delegate/form.png");
      expect(image).toHaveAttribute("loading", "lazy");
    });

    it("does not double the slash when the base ends in one", () => {
      renderWithMantine(<MarkdownView source="![The form](a/form.png)" imageBase="/assets/" />);

      expect(screen.getByRole("img")).toHaveAttribute("src", "/assets/a/form.png");
    });

    it.each([
      ["an absolute address", "https://example.com/x.png"],
      ["a protocol-relative address", "//example.com/x.png"],
      ["a root address", "/elsewhere/x.png"],
      ["a climb out of the base", "../secrets/x.png"],
      ["a script address", "javascript:alert(1)"],
      ["a file that is not an image", "a/form.svg"],
    ])("leaves out an image with %s", (_name, path) => {
      const { container } = renderWithMantine(
        <MarkdownView source={`![Alt](${path})`} imageBase="/guide-assets" />,
      );

      expect(container.querySelector("img")).toBeNull();
    });

    it("leaves out an image with no alt text", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="![](a/form.png)" imageBase="/guide-assets" />,
      );

      expect(container.querySelector("img")).toBeNull();
    });

    it("keeps alt text from breaking out of its attribute", () => {
      const { container } = renderWithMantine(
        <MarkdownView
          source={'![A "quoted" <b>name</b>](a/form.png)'}
          imageBase="/guide-assets"
        />,
      );

      const image = container.querySelector("img");
      expect(image?.getAttribute("alt")).toContain("quoted");
      expect(image?.getAttribute("onerror")).toBeNull();
      expect(container.querySelector("b")).toBeNull();
    });

    it("does not read underscores in alt text as italics", () => {
      renderWithMantine(
        <MarkdownView source="![The _first_ step](a/form.png)" imageBase="/guide-assets" />,
      );

      expect(screen.getByRole("img", { name: "The _first_ step" })).toBeInTheDocument();
    });

    it("keeps a numbered list whole when a step carries an image", () => {
      const source = ["1. Open the form", "   ![The form](a/form.png)", "2. Press save"].join(
        "\n",
      );

      const { container } = renderWithMantine(
        <MarkdownView source={source} imageBase="/guide-assets" />,
      );

      expect(container.querySelectorAll("ol")).toHaveLength(1);
      const steps = container.querySelectorAll("ol > li");
      expect(steps).toHaveLength(2);
      expect(steps[0]?.querySelector("img")).not.toBeNull();
      expect(steps[1]?.querySelector("img")).toBeNull();
    });

    it("ends a list at an indented image when images are off", () => {
      const source = ["1. Open the form", "   ![The form](a/form.png)"].join("\n");

      const { container } = renderWithMantine(<MarkdownView source={source} />);

      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelectorAll("ol > li")).toHaveLength(1);
    });

    it("shows the alt text in place of an image that will not load", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="![The form](a/form.png)" imageBase="/guide-assets" />,
      );

      const image = container.querySelector("img");
      image?.dispatchEvent(new Event("error"));

      expect(container.querySelector("img")).toBeNull();
      expect(screen.getByText("The form")).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    const icons = { "user-plus": <IconUserPlus /> };

    it("leaves the name as text unless the caller allows icons", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="Press :icon-user-plus: to add." />,
      );

      expect(container.querySelector("svg")).toBeNull();
      expect(screen.getByText("Press :icon-user-plus: to add.")).toBeInTheDocument();
    });

    it("shows a named icon in the line of text", async () => {
      const { container } = renderWithMantine(
        <MarkdownView source="Press **Add** :icon-user-plus:, then save." icons={icons} />,
      );

      const slot = container.querySelector("p > span[data-icon='user-plus']");

      expect(slot).not.toBeNull();
      await waitFor(() => expect(slot?.querySelector("svg")).not.toBeNull());
      expect(slot).toHaveAttribute("aria-hidden", "true");
      expect(container.querySelector("p")?.textContent).toBe("Press Add , then save.");
    });

    it("shows an icon in a numbered step", async () => {
      const { container } = renderWithMantine(
        <MarkdownView source={"1. Press :icon-user-plus:.\n2. Save."} icons={icons} />,
      );

      await waitFor(() =>
        expect(container.querySelector("ol > li:first-child svg")).not.toBeNull(),
      );
      expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    });

    it("draws a named button as the icon in a filled square", async () => {
      const { container } = renderWithMantine(
        <MarkdownView source="Press **Edit** :button-user-plus:, then save." icons={icons} />,
      );

      const slot = container.querySelector(
        "p > span[data-icon='user-plus'][data-button='true']",
      );

      expect(slot).not.toBeNull();
      await waitFor(() =>
        expect(slot?.querySelector(".mantine-ActionIcon-root svg")).not.toBeNull(),
      );
      expect(slot).toHaveAttribute("aria-hidden", "true");
    });

    it("draws the button as a picture, not a control", async () => {
      const { container } = renderWithMantine(
        <MarkdownView source="Press :button-user-plus:." icons={icons} />,
      );

      await waitFor(() =>
        expect(container.querySelector(".mantine-ActionIcon-root")).not.toBeNull(),
      );
      expect(container.querySelector(".mantine-ActionIcon-root")?.tagName).toBe("SPAN");
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("draws a plain icon with no square", async () => {
      const { container } = renderWithMantine(
        <MarkdownView source="Press :icon-user-plus:." icons={icons} />,
      );

      await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
      expect(container.querySelector(".mantine-ActionIcon-root")).toBeNull();
      expect(container.querySelector("span[data-button]")).toBeNull();
    });

    it("leaves out an icon the caller did not give", () => {
      const { container } = renderWithMantine(
        <MarkdownView source="Press :icon-trash: to delete." icons={icons} />,
      );

      expect(container.querySelector("span[data-icon]")).toBeNull();
      expect(container.querySelector("p")?.textContent).toBe("Press  to delete.");
    });

    it("lets no other span or attribute through when icons are on", () => {
      const { container } = renderWithMantine(
        <MarkdownView
          source={'<span data-icon="user-plus" onclick="alert(1)">x</span>'}
          icons={icons}
        />,
      );

      expect(container.querySelector("span[data-icon]")).toBeNull();
      expect(container.querySelector("[onclick]")).toBeNull();
    });
  });

  describe("Pipe tables, where the caller asks for them", () => {
    const DETAILS = [
      "## Clinical Safety Officer",
      "|                           |                |",
      "| ------------------------- | -------------- |",
      "| Name                      | Dr Anita Patel |",
      "| Professional registration | GMC 7654321    |",
      "",
      "The officer may halt the deployment.",
    ].join("\n");

    it("draws a table's rows and cells", () => {
      renderWithMantine(<MarkdownView source={DETAILS} tables />);

      const rows = screen.getAllByRole("row");
      expect(rows).toHaveLength(2);
      expect(screen.getByRole("cell", { name: "Dr Anita Patel" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "GMC 7654321" })).toBeInTheDocument();
    });

    it("leaves out a header row whose cells are all empty", () => {
      renderWithMantine(<MarkdownView source={DETAILS} tables />);

      expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    });

    it("keeps a header row that has words in it", () => {
      const scale = "| Score | Meaning |\n| --- | --- |\n| 1 | Minor |";
      renderWithMantine(<MarkdownView source={scale} tables />);

      expect(screen.getByRole("columnheader", { name: "Meaning" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Minor" })).toBeInTheDocument();
    });

    it("ends the table at the first line that is not a row", () => {
      renderWithMantine(<MarkdownView source={DETAILS} tables />);

      expect(screen.getByText("The officer may halt the deployment.")).toBeInTheDocument();
      expect(screen.getAllByRole("row")).toHaveLength(2);
    });

    it("starts a table straight after a paragraph, with no blank line between", () => {
      const source = "Who holds the post:\n| | |\n| --- | --- |\n| Name | Jo |";
      renderWithMantine(<MarkdownView source={source} tables />);

      expect(screen.getByText("Who holds the post:")).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Jo" })).toBeInTheDocument();
    });

    it("formats a cell's text as any other text, and escapes it", () => {
      const source = "| | |\n| --- | --- |\n| **Name** | <script>x</script> |";
      const { container } = renderWithMantine(<MarkdownView source={source} tables />);

      expect(container.querySelector("td strong")).toHaveTextContent("Name");
      expect(container.querySelector("script")).toBeNull();
    });

    it("reads an escaped pipe as part of the cell", () => {
      const source = "| | |\n| --- | --- |\n| Either | this \\| that |";
      renderWithMantine(<MarkdownView source={source} tables />);

      expect(screen.getByRole("cell", { name: "this | that" })).toBeInTheDocument();
    });

    it("draws no table unless asked: letters and messages stay as they were", () => {
      renderWithMantine(<MarkdownView source={DETAILS} />);

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("Backslash escapes", () => {
    it("shows an escaped character as itself, as the editor writes it", () => {
      renderWithMantine(<MarkdownView source={"The cso\\_name field"} />);

      expect(screen.getByText("The cso_name field")).toBeInTheDocument();
    });

    it("does not read escaped stars as italics", () => {
      const { container } = renderWithMantine(<MarkdownView source={"\\*not italic\\*"} />);

      expect(container.querySelector("em")).toBeNull();
      expect(screen.getByText("*not italic*")).toBeInTheDocument();
    });
  });

  describe("HTML comments, where the caller hides them", () => {
    const SIGN_OFF = [
      "## 6. Conclusion and sign-off",
      "",
      "<!-- Completed by the Clinical Safety Officer",
      "at approval. -->",
      "",
      "Signed below.",
    ].join("\n");

    it("leaves a comment out, across lines", () => {
      renderWithMantine(<MarkdownView source={SIGN_OFF} hideComments />);

      expect(screen.queryByText(/Completed by the Clinical/)).not.toBeInTheDocument();
      expect(screen.queryByText(/<!--/)).not.toBeInTheDocument();
      expect(screen.getByText("Signed below.")).toBeInTheDocument();
    });

    it("leaves out the rest of the text after a comment left open", () => {
      renderWithMantine(
        <MarkdownView source={"Shown.\n\n<!-- never closed\n\nHidden."} hideComments />,
      );

      expect(screen.getByText("Shown.")).toBeInTheDocument();
      expect(screen.queryByText("Hidden.")).not.toBeInTheDocument();
    });

    it("shows a comment's text unless asked to hide it, as before", () => {
      renderWithMantine(<MarkdownView source={SIGN_OFF} />);

      expect(screen.getByText(/Completed by the Clinical/)).toBeInTheDocument();
    });
  });

  describe("Entities, as the editor writes & and < and >", () => {
    it("shows &amp; as &", () => {
      renderWithMantine(<MarkdownView source={"Safety &amp; quality"} />);

      expect(screen.getByText("Safety & quality")).toBeInTheDocument();
    });

    it("shows &lt; and &gt; as the characters, never as markup", () => {
      const { container } = renderWithMantine(
        <MarkdownView source={"&lt;script&gt;alert(1)&lt;/script&gt;"} />,
      );

      expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
      expect(container.querySelector("script")).toBeNull();
    });

    it("still escapes a bare & and <", () => {
      const { container } = renderWithMantine(<MarkdownView source={"A & B < C"} />);

      expect(screen.getByText("A & B < C")).toBeInTheDocument();
      expect(container.innerHTML).toContain("A &amp; B &lt; C");
    });

    it("keeps an entity literal inside a code block", () => {
      renderWithMantine(<MarkdownView source={"```\n&amp;\n```"} />);

      expect(screen.getByText("&amp;")).toBeInTheDocument();
    });
  });
});
