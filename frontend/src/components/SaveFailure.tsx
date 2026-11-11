import { Alert } from "@mantine/core";
import { useEffect, useRef } from "react";

export function SaveFailure({
  message,
  title = "Could not save",
  retainsDraft = true,
}: {
  message: string | null;
  title?: string;
  retainsDraft?: boolean;
}) {
  const alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) alert.current?.focus();
  }, [message]);
  return message ? (
    <Alert ref={alert} tabIndex={-1} color="red" role="alert" title={title} mb="md">
      {message} {retainsDraft && "Your entries have not been cleared."}
    </Alert>
  ) : null;
}
