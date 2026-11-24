/**
 * SafetyDocumentSheet Component
 *
 * One safety file document laid out as an A4 page: a header block naming
 * the system and the commit the reader is seeing, and the file's status
 * where one is given, then the document itself. A file moves, so naming
 * the full commit says which state of it this page shows.
 *
 * The body comes as `children`: the document page fills it with
 * `DocumentNodes`, which renders the typed nodes Turva's API builds from
 * the committed Markdown, so nothing in a document can run.
 *
 * @example
 * ```tsx
 * <SafetyDocumentSheet system={file.name} commit={detail.head_sha}>
 *   <DocumentNodes document={detail.document} slug={file.slug} />
 * </SafetyDocumentSheet>
 * ```
 *
 * The status is not yet in Turva's API: `SafetyFile` has none, so the
 * document page leaves it out.
 */

import { Box, Stack } from "@mantine/core";
import type { ReactNode } from "react";

import { IconAlertCircle, IconAlertTriangle } from "@/components/icons/appIcons";
import { StateMessage } from "@/components/message-cards";
import { BodyText, BodyTextBold } from "@/components/typography";
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
  /** Where the file stands. Not yet in Turva's API; left out, no status is shown. */
  status?: SafetyFileStatus;
  /** The full commit the document was read at */
  commit: string | null;
  /** The document itself */
  children: ReactNode;
}

export default function SafetyDocumentSheet({
  system,
  status,
  commit,
  children,
}: SafetyDocumentSheetProps) {
  const sourceAvailable = typeof commit === "string" && /^[a-f0-9]{40}$/.test(commit);

  return (
    <Box className={classes.sheet} data-testid="safety-document-sheet">
      <Stack gap={4} className={classes.meta}>
        <BodyTextBold>{system}</BodyTextBold>
        {status !== undefined &&
          (isSafetyFileStatus(status) ? (
            <BodyText c="dimmed">{STATUS_WORDS[status]}</BodyText>
          ) : (
            <Box role="alert">
              <StateMessage
                icon={<IconAlertCircle />}
                colour="alert"
                title="Safety-file status unavailable"
                description={`Unsupported recorded status: ${String(status)}.`}
              />
            </Box>
          ))}
        {sourceAvailable ? (
          <BodyText c="dimmed" preserveLines>
            As at commit {commit}
          </BodyText>
        ) : (
          <Box role="alert" aria-label="Source version unavailable">
            <StateMessage
              icon={<IconAlertTriangle />}
              colour="warning"
              title="Source version unavailable"
              description={`A full source commit was not supplied. This view cannot establish which evidence version the document or reported status belongs to.${
                commit ? ` Supplied version: ${commit}` : ""
              }`}
            />
          </Box>
        )}
      </Stack>
      {children}
    </Box>
  );
}
