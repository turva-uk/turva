import { Alert, Anchor, Box, Group, Loader, Text, Title } from "@mantine/core";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router";

import type { SafetyDocumentDetail } from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { SafetyDocument } from "../components/SafetyDocument";
import { documentPath } from "../lib/safety/api";

const NOT_FOUND =
  "That document does not exist in this safety file, or you do not have access to it.";

export function SafetyDocumentPage() {
  const { slug, documentKey } = useParams<{ slug: string; documentKey: string }>();
  let path: string;
  try {
    path = documentPath(slug ?? "", documentKey ?? "");
  } catch {
    return (
      <Alert color="red" role="alert" title="Could not load that document">
        The safety file or document identifier is invalid. Return to the safety files list.
        <Anchor component={Link} to="/safety-files" display="block">
          All safety files
        </Anchor>
      </Alert>
    );
  }
  return <DocumentContent path={path} />;
}

function DocumentContent({ path }: { path: string }) {
  const { hash } = useLocation();
  const { data, error } = useApiResource<SafetyDocumentDetail>(path, NOT_FOUND);

  // A link to a section in another document arrives before that document has
  // loaded, so the browser cannot scroll to it by itself.
  useEffect(() => {
    if (!data || !hash) return;
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // A malformed pasted/source fragment must not unmount the evidence page.
      // Retain it literally rather than guessing a repaired heading address.
    }
    document.getElementById(id)?.scrollIntoView();
  }, [data, hash]);

  if (error) {
    return (
      <Box>
        <Anchor component={Link} to="/safety-files">
          All safety files
        </Anchor>
        <Alert color="red" role="alert" title="Could not load that document" mt="md">
          {error}
        </Alert>
      </Box>
    );
  }
  if (!data) return <Loader aria-label="Loading the document" />;

  const { document: doc, safety_file: file, last_changed: last } = data;

  return (
    <Box maw={960}>
      <Anchor component={Link} to={`/safety-files/${file.slug}`}>
        Back to {file.name}
      </Anchor>
      <nav aria-label="Safety documents">
        <Group gap="xs" mt="sm" wrap="wrap" component="ul" className="document-tabs">
          {data.documents.map((item) => (
            <li key={item.key}>
              <Link
                to={documentPath(file.slug, item.key)}
                className="document-tab"
                aria-current={item.key === doc.key ? "page" : undefined}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </Group>
      </nav>
      <Title order={1} size="h2" mt="md">
        {doc.title}
      </Title>
      <Text size="sm" mt="xs">
        Read-only view of <code>{doc.path}</code> at commit <code>{doc.source_commit}</code>,
        the version captured when this page loaded. This is not a PDF export or an approval.
      </Text>
      {last && (
        <Text size="sm" c="dimmed">
          Last changed in <code>{last.short_sha}</code> by {last.author_name} on{" "}
          <time dateTime={last.committed_at}>
            {new Date(last.committed_at).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
          : {last.subject}
        </Text>
      )}

      {!doc.available ? (
        <>
          <Alert
            color="red"
            role="alert"
            mt="md"
            title={
              doc.reason === "unsupported-formatting"
                ? "Formatted view unavailable"
                : "This document cannot be shown"
            }
          >
            {doc.message}
          </Alert>
          {doc.reason === "unsupported-formatting" && typeof doc.source === "string" && (
            <section>
              <Title order={2} size="h3" id="committed-source" mt="md">
                Committed Markdown source
              </Title>
              <div
                role="region"
                aria-labelledby="committed-source"
                tabIndex={0}
                className="document-source"
              >
                <pre>
                  <code>{doc.source}</code>
                </pre>
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {doc.unsupported > 0 && (
            <Alert color="yellow" mt="md" title="Some content is not shown">
              This document contains {doc.unsupported}{" "}
              {doc.unsupported === 1 ? "item" : "items"} Turva does not display here, such as
              images, embedded or active content, or links with unsupported addresses. Each is
              marked where it occurs. Review the committed source for the complete record.
            </Alert>
          )}
          <Box mt="lg">
            <SafetyDocument blocks={doc.blocks} slug={file.slug} />
          </Box>
        </>
      )}
    </Box>
  );
}
