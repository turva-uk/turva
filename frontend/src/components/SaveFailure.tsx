import { Alert } from "@mantine/core";

export function SaveFailure({
  message,
  title = "Could not save",
  retainsDraft = true,
}: {
  message: string | null;
  title?: string;
  retainsDraft?: boolean;
}) {
  return message ? (
    <Alert color="red" role="alert" title={title} mb="md">
      {message} {retainsDraft && "Your entries have not been cleared."}
    </Alert>
  ) : null;
}
