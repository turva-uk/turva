import { Box, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";

import { ApiError } from "../api/client";
import type { SafetyDocumentDetail } from "../api/types";
import { IconAlertCircle } from "../components/icons/appIcons";
import { PageSpinner } from "../components/loading-spinner";
import { StateMessage } from "../components/message-cards";
import DocumentList from "../components/safety/DocumentList";
import DocumentNodes from "../components/safety/DocumentNodes";
import SafetyDocumentSheet from "../components/safety/SafetyDocumentSheet";
import { BodyText, PageHeader, TextLink } from "../components/typography";
import { documentPath, getDocument, isNotFound } from "../lib/safety";

const NOT_FOUND =
  "That document does not exist in this safety file, or you do not have access to it.";

export function SafetyDocumentPage() {
  const { slug = "", documentKey = "" } = useParams<{ slug: string; documentKey: string }>();

  // Refuse a bad identifier before any request, rather than letting a
  // dot segment or separator reach the URL.
  let path: string;
  try {
    path = documentPath(slug, documentKey);
  } catch {
    return (
      <Failure description="The safety file or document identifier is invalid. Return to the safety files list." />
    );
  }

  // Keyed on the path, so moving to another document starts afresh: the
  // last document never shows under the next one's heading (TH-001).
  return <DocumentContent key={path} slug={slug} documentKey={documentKey} />;
}

function Failure({ description }: { description: string }) {
  return (
    <Stack maw={960} gap="lg">
      <TextLink to="/safety-files" standalone>
        All safety files
      </TextLink>
      <PageHeader title="Document" />
      <Box role="alert">
        <StateMessage
          icon={<IconAlertCircle />}
          colour="alert"
          title="Could not load that document"
          description={description}
        />
      </Box>
    </Stack>
  );
}

function DocumentContent({ slug, documentKey }: { slug: string; documentKey: string }) {
  const { hash } = useLocation();
  const [data, setData] = useState<SafetyDocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getDocument(slug, documentKey, controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (isNotFound(reason)) setError(NOT_FOUND);
        else
          setError(
            reason instanceof ApiError
              ? reason.message
              : "Something went wrong. Please try again.",
          );
      });

    return () => controller.abort();
  }, [slug, documentKey]);

  // A link to a section in another document arrives before that document
  // has loaded, so the browser cannot scroll to it by itself.
  useEffect(() => {
    if (!data || !hash) return;

    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // A malformed fragment must not unmount the evidence page. Keep it
      // literally rather than guessing a repaired heading address.
    }
    document.getElementById(id)?.scrollIntoView();
  }, [data, hash]);

  if (error) return <Failure description={error} />;
  if (!data) return <PageSpinner label="Loading the document" />;

  const { document: doc, safety_file: file, last_changed: last } = data;

  return (
    <Box maw={960}>
      <Stack gap="lg">
        <TextLink to={`/safety-files/${file.slug}`} standalone>
          Back to {file.name}
        </TextLink>
        <DocumentList
          documents={data.documents}
          current={doc.key}
          href={(key) => documentPath(file.slug, key)}
        />
        <PageHeader title={doc.title} />
        <Stack gap={4}>
          <BodyText>
            Read-only view of <code>{doc.path}</code> at commit <code>{doc.source_commit}</code>
            , the version captured when this page loaded. This is not a PDF export or an
            approval.
          </BodyText>
          {last && (
            <BodyText c="dimmed">
              Last changed in <code>{last.short_sha}</code> by {last.author_name} on{" "}
              <time dateTime={last.committed_at}>
                {new Date(last.committed_at).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
              : {last.subject}
            </BodyText>
          )}
        </Stack>

        <SafetyDocumentSheet system={file.name} commit={data.head_sha}>
          <DocumentNodes document={doc} slug={file.slug} />
        </SafetyDocumentSheet>
      </Stack>
    </Box>
  );
}
