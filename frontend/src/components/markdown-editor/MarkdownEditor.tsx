/**
 * MarkdownEditor Component
 *
 * A rich text editor that reads and writes Markdown: a hazard's notes, a
 * safety file's documents. Built on Mantine's Tiptap integration
 * (`@mantine/tiptap`) with Tiptap's own Markdown extension, so the
 * officer sees headings, lists and emphasis as they write, and what is
 * saved is the Markdown the safety file keeps in git, readable with no
 * software beyond a text editor.
 *
 * Bold, italic, headings, lists, links and quotes, tables, and the notes
 * a template leaves as HTML comments, and nothing more: every extra
 * feature is another way for a file to carry something its Markdown
 * cannot round-trip. The list is in `extensions.ts`, and
 * `editorKeepsEverything` there says whether a document's words all
 * survive it, so a page can refuse to open one that would lose some.
 *
 * @example
 * ```tsx
 * <MarkdownEditor
 *   label="Clinical safety case report"
 *   value={text}
 *   onChange={setText}
 * />
 * ```
 */

import { Stack } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { type Editor, useEditor, useEditorState } from "@tiptap/react";
import type { ReactElement } from "react";
import Icon from "@/components/icons/Icon";
import {
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconColumnRemove,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconRowRemove,
  IconTablePlus,
} from "@/components/icons/appIcons";
import { LAYOUT_STICKY_TOP } from "@/components/layouts/layoutConstants";
import { BodyTextBold } from "@/components/typography";
import { markdownEditorExtensions, tidyMarkdown } from "./extensions";

/** One of the table's controls: what it says, shows and does. */
interface TableAction {
  label: string;
  icon: ReactElement;
  run: (editor: Editor) => boolean;
  can: (editor: Editor) => boolean;
}

/**
 * The rows and columns of the table the cursor is in. No merging of
 * cells: a Markdown table cannot hold a merged cell, so it would be lost
 * on saving, and the document then refused by the editor's check.
 */
const TABLE_ACTIONS: readonly TableAction[] = [
  {
    label: "Add a row above",
    icon: <IconRowInsertTop />,
    run: (e) => e.chain().focus().addRowBefore().run(),
    can: (e) => e.can().addRowBefore(),
  },
  {
    label: "Add a row below",
    icon: <IconRowInsertBottom />,
    run: (e) => e.chain().focus().addRowAfter().run(),
    can: (e) => e.can().addRowAfter(),
  },
  {
    label: "Delete the row",
    icon: <IconRowRemove />,
    run: (e) => e.chain().focus().deleteRow().run(),
    can: (e) => e.can().deleteRow(),
  },
  {
    label: "Add a column to the left",
    icon: <IconColumnInsertLeft />,
    run: (e) => e.chain().focus().addColumnBefore().run(),
    can: (e) => e.can().addColumnBefore(),
  },
  {
    label: "Add a column to the right",
    icon: <IconColumnInsertRight />,
    run: (e) => e.chain().focus().addColumnAfter().run(),
    can: (e) => e.can().addColumnAfter(),
  },
  {
    label: "Delete the column",
    icon: <IconColumnRemove />,
    run: (e) => e.chain().focus().deleteColumn().run(),
    can: (e) => e.can().deleteColumn(),
  },
];

/**
 * The table controls: the row and column ones while the cursor is in a
 * table, and one to start a table while it is not.
 */
function TableControls({ editor }: { editor: Editor | null }) {
  // Whether the cursor is in a table, and which actions it allows there.
  // Compared deeply, so the toolbar redraws only when either changes.
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      inTable: current?.isActive("table") ?? false,
      allowed: TABLE_ACTIONS.map((action) => (current ? action.can(current) : false)),
    }),
  });
  const inTable = state?.inTable ?? false;

  if (!editor) return null;

  if (!inTable) {
    return (
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.Control
          aria-label="Insert a table"
          title="Insert a table"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()
          }
        >
          <Icon icon={<IconTablePlus />} size="sm" />
        </RichTextEditor.Control>
      </RichTextEditor.ControlsGroup>
    );
  }

  return (
    <RichTextEditor.ControlsGroup>
      {TABLE_ACTIONS.map((action, index) => (
        <RichTextEditor.Control
          key={action.label}
          aria-label={action.label}
          title={action.label}
          disabled={!(state?.allowed[index] ?? false)}
          onClick={() => action.run(editor)}
        >
          <Icon icon={action.icon} size="sm" />
        </RichTextEditor.Control>
      ))}
    </RichTextEditor.ControlsGroup>
  );
}

export interface MarkdownEditorProps {
  /** What the text is, shown above the editor and read by a screen reader */
  label: string;
  /** The Markdown to start from */
  value: string;
  /** Called with the Markdown after every change */
  onChange: (markdown: string) => void;
  /** Read-only, as for somebody who may read the file but not write it */
  readOnly?: boolean;
}

export default function MarkdownEditor({
  label,
  value,
  onChange,
  readOnly = false,
}: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: markdownEditorExtensions(),
    content: value,
    contentType: "markdown",
    editable: !readOnly,
    editorProps: {
      attributes: {
        "aria-label": label,
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onUpdate: ({ editor: changed }) => onChange(tidyMarkdown(changed.getMarkdown())),
  });

  return (
    <Stack gap="xs">
      <BodyTextBold>{label}</BodyTextBold>
      <RichTextEditor editor={editor}>
        {!readOnly && (
          // Sticky, so a long document can be formatted, and its tables
          // changed, far below the top without scrolling back up. It
          // sticks to the very top of the page's scrolling area, which is
          // below the ribbon, and goes with the editor once scrolled past.
          <RichTextEditor.Toolbar sticky stickyOffset={LAYOUT_STICKY_TOP}>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.H2 />
              <RichTextEditor.H3 />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
              <RichTextEditor.Blockquote />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Link />
              <RichTextEditor.Unlink />
            </RichTextEditor.ControlsGroup>
            <TableControls editor={editor} />
          </RichTextEditor.Toolbar>
        )}
        <RichTextEditor.Content />
      </RichTextEditor>
    </Stack>
  );
}
