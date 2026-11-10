import { useRef, useState } from "react";

import { ApiError } from "./client";

/** Keep drafts on failure, show server field errors, and prevent duplicate saves. */
export function useSubmission() {
  const pending = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function run(
    action: () => Promise<void>,
    setErrors?: (errors: Record<string, string>) => void,
  ) {
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setFailure(null);
    try {
      await action();
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Your entries are still here; please try again.",
      );
      if (error instanceof ApiError) {
        setErrors?.(
          Object.fromEntries(
            Object.entries(error.fieldErrors).map(([key, messages]) => [
              key,
              messages.join(" "),
            ]),
          ),
        );
      }
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  return { run, submitting, failure };
}
