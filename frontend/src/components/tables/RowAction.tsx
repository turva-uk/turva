import { Button } from "@mantine/core";

/** A native keyboard alternative to the pointer shortcut on a record's row. */
export default function RowAction({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <Button
      variant="default"
      size="xs"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      Open
    </Button>
  );
}
