/**
 * PDFDownload Component
 *
 * Downloads a draft of the safety file as a PDF, built from the version
 * the page opened. The opened commit goes with the request as
 * `expected_head`, so if the file has changed since, the server refuses
 * rather than building a PDF of a version the reader has not seen (TH-007).
 *
 * It says plainly that the PDF is a draft, not approval to deploy, and
 * names the version it is fixed to. A failure says so, and never claims a
 * PDF was prepared.
 *
 * The download defaults to `downloadPdf` in `@/lib/safety`; stories and
 * tests pass a stand-in, as for `previewAssessment`.
 *
 * @example
 * ```tsx
 * <PDFDownload key={detail.head_sha} slug={file.slug} head={detail.head_sha} />
 * ```
 */

import { Box, Group, Stack } from "@mantine/core";
import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/api/client";
import SecondaryButton from "@/components/button/SecondaryButton";
import { FormStatus } from "@/components/form/Form";
import { BodyText } from "@/components/typography";
import { downloadPdf } from "@/lib/safety";

export interface PDFDownloadProps {
  /** The safety file's slug */
  slug: string;
  /** The full commit the page opened, which the PDF is fixed to */
  head: string;
  /** Fetches the PDF. Defaults to `downloadPdf`; stories and tests pass a stand-in. */
  download?: (slug: string, head: string) => Promise<Blob>;
}

export default function PDFDownload({ slug, head, download = downloadPdf }: PDFDownloadProps) {
  const pending = useRef(false);
  const objectUrl = useRef<string | null>(null);
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [prepared, setPrepared] = useState(false);
  const version = head.slice(0, 8);

  // Let go of the last file when the page closes.
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  async function prepare() {
    // One request at a time, however quickly the button is pressed.
    if (pending.current) return;
    pending.current = true;
    setWorking(true);
    setFailure(null);
    setPrepared(false);

    try {
      const file = await download(slug, head);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(file);

      const link = window.document.createElement("a");
      link.href = objectUrl.current;
      link.download = `${slug}-${version}.pdf`;
      link.click();
      setPrepared(true);
    } catch (error) {
      setFailure(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
      );
    } finally {
      pending.current = false;
      setWorking(false);
    }
  }

  return (
    <Stack gap="xs">
      {failure && (
        <FormStatus variant="error" title="Could not prepare the PDF" description={failure} />
      )}
      <Group justify="flex-end">
        <SecondaryButton onClick={() => void prepare()} loading={working}>
          Download draft safety file (PDF)
        </SecondaryButton>
      </Group>
      <BodyText c="dimmed">
        Fixed to version {version}. Includes the controlled text documents, all hazard
        narratives and mitigation evidence. Attachments are references, not embedded. The first
        build may take a few seconds.
      </BodyText>
      {prepared && (
        <Box role="status">
          <BodyText>
            PDF prepared for version {version}. Check your browser downloads. It is a draft, not
            approval to deploy.
          </BodyText>
        </Box>
      )}
    </Stack>
  );
}
