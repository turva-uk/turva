/**
 * A document goes through the editor and comes back with everything in
 * it: above all its tables, which the editor once dropped, so saving
 * wrote a safety file's document back without them.
 */

import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { readFileSync } from "node:fs";
import path from "node:path";
import { editorKeepsEverything, markdownEditorExtensions, tidyMarkdown } from "./extensions";

/**
 * The Clinical Risk Management Plan as a new file has it: the template,
 * with its placeholders filled as the Riverbank demo fills them. The
 * template on its own passed, with `{{ cso_email }}` where the address
 * goes, while the filled plan was refused.
 */
function filledPlan(): string {
  const template = readFileSync(
    path.resolve(
      __dirname,
      "../../../../safety-file-templates/dcb0160-deployment/docs/clinical-risk-management-plan.md",
    ),
    "utf8",
  );
  const values: Record<string, string> = {
    name: "BP@Home remote blood pressure monitoring",
    organisation: "Riverbank Health Federation",
    cso_name: "Dr Anita Patel",
    cso_registration: "GMC 7654321",
    cso_email: "a.patel@riverbank.example.nhs.uk",
    risk_acceptability_criteria: "Risks at level 4 & above must be reduced.",
    governance: "Reviewed by the federation's safety & quality group.",
  };

  return template.replace(/\{\{ (\w+) \}\}/g, (_m, key: string) => values[key] ?? key);
}

/** The Clinical Risk Management Plan's table of the officer, as the template has it. */
const OFFICER = [
  "## 2. Clinical Safety Officer",
  "",
  "|                           |                        |",
  "| ------------------------- | ---------------------- |",
  "| Name                      | {{ cso_name }}         |",
  "| Professional registration | {{ cso_registration }} |",
  "| Contact                   | {{ cso_email }}        |",
  "",
  "The Clinical Safety Officer may halt the deployment.",
].join("\n");

/** A scale with a header row of words, as the severity scale might be written. */
const SCALE = [
  "| Score | Meaning |",
  "| ----- | ------- |",
  "| 1     | Minor   |",
  "| 2     | Significant |",
].join("\n");

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

/** The Markdown the editor writes for *source*, untouched. */
function throughTheEditor(source: string): string {
  editor = new Editor({
    extensions: markdownEditorExtensions(),
    content: source,
    contentType: "markdown",
  });

  return editor.getMarkdown();
}

/**
 * A table's rows as their cells' words, so padding does not count, and
 * nor does a backslash escape: the editor writes `cso_name` as
 * `cso\\_name`, which Markdown reads as the same thing.
 */
function rows(markdown: string): string[][] {
  return markdown
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim().replace(/\\(.)/g, "$1")),
    )
    .filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

describe("the editor's Markdown", () => {
  it("keeps the officer's table, every row and cell", () => {
    const back = throughTheEditor(OFFICER);

    expect(rows(back)).toEqual(rows(OFFICER));
  });

  it("keeps the table a table, with its divider", () => {
    const back = throughTheEditor(OFFICER);

    expect(back).toMatch(/^\|.*\|\n\|\s*:?-+/m);
  });

  it("keeps what is either side of the table", () => {
    const back = throughTheEditor(OFFICER);

    expect(back).toContain("## 2. Clinical Safety Officer");
    expect(back).toContain("The Clinical Safety Officer may halt the deployment.");
  });

  it("keeps a header row of words as the header", () => {
    const back = throughTheEditor(SCALE);

    expect(rows(back)).toEqual(rows(SCALE));
  });

  it("writes the same thing a second time, so saving twice changes nothing", () => {
    const once = throughTheEditor(OFFICER);
    editor?.destroy();
    const twice = throughTheEditor(once);

    expect(twice).toBe(once);
  });

  describe("a note left as an HTML comment", () => {
    const SIGN_OFF = [
      "## 6. Conclusion and sign-off",
      "",
      "<!-- This section is completed by the Clinical Safety Officer at",
      "approval. An unsigned safety case should look unsigned. -->",
      "",
      "|                         |     |",
      "| ----------------------- | --- |",
      "| Clinical Safety Officer |     |",
    ].join("\n");

    it("keeps the comment exactly, line break and all", () => {
      const back = throughTheEditor(SIGN_OFF);

      expect(back).toContain(
        "<!-- This section is completed by the Clinical Safety Officer at\n" +
          "approval. An unsigned safety case should look unsigned. -->",
      );
    });

    it("shows it in the editor as a note the published page leaves out", () => {
      throughTheEditor(SIGN_OFF);

      expect(editor?.getHTML()).toContain("Note, not shown on the published page:");
    });

    it("leaves other HTML to the Markdown extension, as before", () => {
      const back = throughTheEditor("Before.\n\n<p>A paragraph.</p>\n\nAfter.");

      expect(back).toContain("A paragraph.");
      expect(back).not.toContain("<!--");
    });
  });

  describe("editorKeepsEverything", () => {
    it("is true of the template's documents, tables and notes included", () => {
      expect(editorKeepsEverything(OFFICER)).toBe(true);
      expect(
        editorKeepsEverything("## Sign-off\n\n<!-- Completed at approval. -->\n\n---\n\nEnd."),
      ).toBe(true);
    });

    it("does not count formatting written another way", () => {
      expect(editorKeepsEverything("* one\n* two\n\n__bold__ text")).toBe(true);
    });

    it("is false when the editor would lose words", () => {
      // A comment inside a paragraph, rather than on its own lines, is
      // not a note the editor holds: it would be dropped.
      expect(editorKeepsEverything("Some text <!-- a note in the line --> more.")).toBe(false);
    });
  });

  describe("an address the editor turned into a link", () => {
    it("is written back as the address, an email included", () => {
      expect(tidyMarkdown("Contact [a.b@x.nhs.uk](mailto:a.b@x.nhs.uk) now.")).toBe(
        "Contact a.b@x.nhs.uk now.",
      );
      expect(tidyMarkdown("See [https://x.nhs.uk/a](https://x.nhs.uk/a) here.")).toBe(
        "See https://x.nhs.uk/a here.",
      );
    });

    it("leaves a link with words of its own as it is", () => {
      const link = "Read [the guidance](https://x.nhs.uk/guide).";

      expect(tidyMarkdown(link)).toBe(link);
    });

    it("keeps the officer's address plain through the editor", () => {
      const back = tidyMarkdown(throughTheEditor(filledPlan()));

      expect(back).toContain("a.patel@riverbank.example.nhs.uk");
      expect(back).not.toContain("mailto:");
    });
  });

  describe("the plan as a new file has it", () => {
    it("opens: the editor keeps every word, the address and & included", () => {
      expect(editorKeepsEverything(filledPlan())).toBe(true);
    });

    it("comes back the same a second time, so saving twice changes nothing", () => {
      const once = tidyMarkdown(throughTheEditor(filledPlan()));
      editor?.destroy();
      const twice = tidyMarkdown(throughTheEditor(once));

      expect(twice).toBe(once);
    });
  });

  describe("a table changed with the editor's commands", () => {
    const TABLE = "| Score | Meaning |\n| --- | --- |\n| 1 | Minor |";

    /** The table after *change*, with the cursor in its last cell. */
    function changed(change: (e: Editor) => void): string {
      editor = new Editor({
        extensions: markdownEditorExtensions(),
        content: TABLE,
        contentType: "markdown",
      });
      editor.commands.focus("end");
      change(editor);

      return tidyMarkdown(editor.getMarkdown());
    }

    it("saves an added row, and opens again keeping it", () => {
      const back = changed((e) => {
        e.commands.addRowAfter();
      });

      expect(rows(back)).toHaveLength(3);
      expect(editorKeepsEverything(back)).toBe(true);
    });

    it("saves an added column, and opens again keeping it", () => {
      const back = changed((e) => {
        e.commands.addColumnAfter();
      });

      expect(rows(back).every((row) => row.length === 3)).toBe(true);
      expect(editorKeepsEverything(back)).toBe(true);
    });

    it("saves a deleted row", () => {
      const back = changed((e) => {
        e.commands.deleteRow();
      });

      expect(rows(back)).toHaveLength(1);
      expect(back).not.toContain("Minor");
    });

    it("saves a deleted column", () => {
      const back = changed((e) => {
        e.commands.deleteColumn();
      });

      expect(back).toContain("Score");
      expect(back).not.toContain("Meaning");
    });
  });
});
