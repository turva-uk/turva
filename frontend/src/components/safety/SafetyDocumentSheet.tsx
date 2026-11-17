/**
 * SafetyDocumentSheet Component
 *
 * One safety file document laid out as an A4 page: a header block naming
 * the system, the file's status and the commit the reader is seeing, then
 * the document's Markdown. A file moves, so naming the commit says which
 * state of it this page shows.
 *
 * The Markdown is shown through `MarkdownView`, which sanitises what it
 * renders: a safety file's text is untrusted.
 *
 * @example
 * ```tsx
 * <SafetyDocumentSheet
 *   system="BP@Home"
 *   status="draft"
 *   commit={document.head_sha}
 *   text={document.text}
 * />
 * ```
 *
 * Not yet in Turva's API: the file's prose documents have no route yet, so this takes the text as a prop.
 */

import { Box, Stack } from "@mantine/core";
import { BodyText, BodyTextBold, MarkdownView } from "@/components/typography";
import type { SafetyFileStatus } from "@/lib/safety";
import classes from "./SafetyDocumentSheet.module.css";

const STATUS_WORDS: Record<SafetyFileStatus, string> = {
  draft: "Draft, not approved",
  approved: "Approved by the Clinical Safety Officer",
  accepted: "Accepted by Top Management for go-live",
};

export interface SafetyDocumentSheetProps {
  /** The system the file is about, named in the header */
  system: string;
  /** Where the file stands */
  status: SafetyFileStatus;
  /** The commit this text was read at */
  commit: string | null;
  /** The document's Markdown */
  text: string;
}

export default function SafetyDocumentSheet({
  system,
  status,
  commit,
  text,
}: SafetyDocumentSheetProps) {
  return (
    <Box className={classes.sheet} data-testid="safety-document-sheet">
      <Stack gap={4} className={classes.meta}>
        <BodyTextBold>{system}</BodyTextBold>
        <BodyText c="dimmed">{STATUS_WORDS[status]}</BodyText>
        {commit && <BodyText c="dimmed">As at commit {commit.slice(0, 8)}</BodyText>}
      </Stack>
      <MarkdownView source={text} tables hideComments />
    </Box>
  );
}
