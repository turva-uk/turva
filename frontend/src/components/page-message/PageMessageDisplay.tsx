/**
 * PageMessageDisplay Component
 *
 * Renders the stack of page-level messages from PageMessageContext.
 * `PageHeader` places it beneath the page's title. MainLayout places a
 * `fallback` one above the page content, which stays quiet while a
 * header is showing the messages, so a page with no header still has
 * them. Renders nothing when empty.
 *
 * Messages are displayed in FIFO order (newest at bottom).
 * Each message is individually dismissible.
 */

import { Stack } from "@mantine/core";
import { FormStatus } from "@/components/form/Form";
import { usePageMessage } from "./PageMessageContext";

export interface PageMessageDisplayProps {
  /** Show the messages only when no page header is showing them. */
  fallback?: boolean;
}

export default function PageMessageDisplay({ fallback = false }: PageMessageDisplayProps) {
  const { messages, dismiss, headerId } = usePageMessage();

  if (messages.length === 0 || (fallback && headerId !== null)) {
    return null;
  }

  return (
    <Stack gap="sm">
      {messages.map((msg) => (
        <FormStatus
          key={msg.id}
          variant={msg.variant}
          title={msg.title}
          description={msg.description}
          onDismiss={() => dismiss(msg.id)}
        />
      ))}
    </Stack>
  );
}
