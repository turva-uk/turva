import { useEffect, useState } from "react";

import { ApiError, api } from "./client";

export interface ApiResource<T> {
  data: T | null;
  /** Null while loading and on success. A string the interface can show on
   *  failure - never an empty state that looks like "no results". */
  error: string | null;
  loading: boolean;
}

/**
 * Fetch a resource on mount, and again whenever `path` changes.
 *
 * One hook rather than the same `useEffect` written out in each page, for the
 * reason that applies to every repeated rule in this project: three copies of
 * the error handling is three chances for one of them to swallow a failure
 * quietly. A list that renders empty because the request failed looks exactly
 * like a list that is genuinely empty, and in a safety tool those are very
 * different statements - see TH-001.
 *
 * The request is aborted if `path` changes or the component unmounts, so a
 * slow response for a safety file the user has navigated away from cannot
 * overwrite the one they are now looking at.
 */
export function useApiResource<T>(path: string, notFoundMessage?: string): ApiResource<T> {
  const [state, setState] = useState<ApiResource<T> & { path: string }>({
    path,
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();

    // Resetting to the loading state when `path` changes is the point:
    // without it the previous resource stays on screen while the new one
    // loads, which reads as though the new page is showing the old page's
    // data. On a safety file detail page that would mean one file's hazards
    // under another file's heading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ path, data: null, error: null, loading: true });

    api
      .get<T>(path, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ path, data, error: null, loading: false });
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          cause instanceof ApiError
            ? cause.status === 404 && notFoundMessage
              ? notFoundMessage
              : cause.message
            : "Something went wrong. Please try again.";
        setState({ path, data: null, error: message, loading: false });
      });

    return () => controller.abort();
  }, [path, notFoundMessage]);

  // Effects run after paint. Never present old evidence or a risk preview for
  // even one render under a new path/selection (TH-001/TH-008).
  return state.path === path ? state : { data: null, error: null, loading: true };
}
