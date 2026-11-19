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

import { Alert, Box, Stack } from "@mantine/core";
import { BodyText, BodyTextBold, MarkdownView } from "@/components/typography";
import { isSafetyFileStatus, type SafetyFileStatus } from "@/lib/safety";
import classes from "./SafetyDocumentSheet.module.css";

const STATUS_WORDS: Record<SafetyFileStatus, string> = {
  draft: "Draft, not approved",
  approved: "Recorded as approved by the Clinical Safety Officer",
  accepted: "Recorded as accepted by Top Management for go-live",
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
  const sourceAvailable = typeof commit === "string" && /^[a-f0-9]{40}$/.test(commit);
  return (
    <Box className={classes.sheet} data-testid="safety-document-sheet">
      <Stack gap={4} className={classes.meta}>
        <BodyTextBold>{system}</BodyTextBold>
        {isSafetyFileStatus(status) ? (
          <BodyText c="dimmed">{STATUS_WORDS[status]}</BodyText>
        ) : (
          <Alert role="alert" color="red" title="Safety-file status unavailable">
            Unsupported recorded status: {String(status)}.
          </Alert>
        )}
        {sourceAvailable ? (
          <BodyText c="dimmed" preserveLines>
            As at commit {commit}
          </BodyText>
        ) : (
          <Alert role="alert" color="yellow" title="Source version unavailable">
            A full source commit was not supplied. This view cannot establish which evidence
            version the text or reported status belongs to.
            {commit && <BodyText preserveLines>Supplied version: {commit}</BodyText>}
          </Alert>
        )}
      </Stack>
      <MarkdownView source={text} tables />
    </Box>
  );
}
