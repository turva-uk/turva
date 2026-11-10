import { Alert } from "@mantine/core";

export function SaveFailure({ message }: { message: string | null }) {
  return message ? (
    <Alert color="red" role="alert" title="Could not save" mb="md">
      {message} Your entries have not been cleared.
    </Alert>
  ) : null;
}
