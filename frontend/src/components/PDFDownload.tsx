import { Box, Button, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";

import { api } from "../api/client";
import { useSubmission } from "../api/useSubmission";
import { SaveFailure } from "./SaveFailure";

export function PDFDownload({ slug, head }: { slug: string; head: string }) {
  const { run, submitting, failure } = useSubmission();
  const [prepared, setPrepared] = useState(false);
  const objectUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  return (
    <Box mt="lg">
      <SaveFailure message={failure} title="Could not prepare the PDF" retainsDraft={false} />
      <Button
        variant="outline"
        loading={submitting}
        onClick={() =>
          void run(async () => {
            setPrepared(false);
            const document = await api.download(
              `/safety-files/${slug}/pdf/?expected_head=${head}`,
            );
            if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
            objectUrl.current = URL.createObjectURL(document);
            const link = window.document.createElement("a");
            link.href = objectUrl.current;
            link.download = `${slug}-${head.slice(0, 8)}.pdf`;
            link.click();
            setPrepared(true);
          })
        }
      >
        Download draft safety file (PDF)
      </Button>
      <Text size="sm" c="dimmed" mt="xs">
        Fixed to version {head.slice(0, 8)}. Includes the controlled text documents, all hazard
        narratives and mitigation evidence. Attachments are references, not embedded. The first
        build may take a few seconds.
      </Text>
      {prepared && (
        <Text size="sm" role="status" mt="xs">
          PDF prepared for version {head.slice(0, 8)}. Check your browser downloads. It is a
          draft, not approval to deploy.
        </Text>
      )}
    </Box>
  );
}
