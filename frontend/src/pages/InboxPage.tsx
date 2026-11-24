import { Box, Stack } from "@mantine/core";

import { EmptyState, PageHeader } from "../components/typography";

/**
 * The inbox the ribbon's envelope opens. Turva has nothing to put here
 * yet, so it says so; requests waiting on somebody will be listed here
 * once Turva has them.
 */
export function InboxPage() {
  return (
    <Box maw={960}>
      <Stack>
        <PageHeader title="Inbox" />
        <EmptyState>Nothing is waiting for you.</EmptyState>
      </Stack>
    </Box>
  );
}
