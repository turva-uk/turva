/**
 * The HTTP client for Turva's API.
 *
 * Two things here are not optional, and the frontend this replaced got both
 * wrong because it was written against a FastAPI backend that did not need
 * them.
 *
 * **CSRF.** Django enforces a CSRF token on every unsafe method. The removed
 * frontend sent `credentials: "include"` but no token at all, so every POST
 * against the current backend would be refused. The token is read from the
 * `csrftoken` cookie and echoed in `X-CSRFToken`, which is Django's documented
 * pattern.
 *
 * **Errors are never silent.** `fetch` does not reject on a 4xx or 5xx, so a
 * failed save looks exactly like a successful one unless the status is
 * checked. In a tool where a half-saved hazard is a safety concern - TH-001,
 * an incomplete safety case presented as complete - that is not a UX detail.
 * Every non-2xx here throws `ApiError`, so a caller that forgets to handle a
 * failure gets a visible exception rather than a blank form that looks saved.
 */

const API_ROOT = import.meta.env.VITE_API_ROOT ?? "/api/v1";

/** A field-keyed map of validation messages, as DRF returns them. */
export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldErrors;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** The caller is not signed in, or their session has expired. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /**
   * Signed in, but not permitted. For Turva this most often means an
   * unconfirmed email address rather than a missing role, so the message is
   * worth showing rather than replacing with a generic refusal.
   */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

function csrfToken(): string {
  // `document.cookie` rather than a stored copy: Django rotates the token on
  // login, and a value captured at page load would be stale from then on.
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

/** DRF can nest field errors; Mantine uses dotted paths for nested inputs. */
function flattenErrors(value: unknown, path = "", errors: FieldErrors = {}): FieldErrors {
  if (typeof value === "string") {
    (errors[path || "non_field_errors"] ??= []).push(value);
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      flattenErrors(entry, typeof entry === "string" ? path : `${path}.${index}`, errors),
    );
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) =>
      flattenErrors(entry, path ? `${path}.${key}` : key, errors),
    );
  }
  return errors;
}

async function describeFailure(response: Response): Promise<ApiError> {
  let detail = `${response.status} ${response.statusText}`;
  let fieldErrors: FieldErrors = {};

  try {
    const body = await response.json();
    if (typeof body?.detail === "string") {
      detail = body.detail;
    } else if (body && typeof body === "object") {
      // Never cast nested objects to string arrays: the save handler would
      // throw while trying to join them and lose the useful validation error.
      fieldErrors = flattenErrors(body);
      const first = Object.values(fieldErrors).flat()[0];
      if (typeof first === "string") {
        detail = first;
      }
    }
  } catch {
    // A non-JSON body. The status line is all we have, and it is better than
    // reporting nothing.
  }

  return new ApiError(response.status, detail, fieldErrors);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers["X-CSRFToken"] = csrfToken();
  }

  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method,
      headers,
      // Send and accept the session cookie. Without this the API treats every
      // request as anonymous, whatever the user did on the login screen.
      credentials: "include",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (cause) {
    // A dropped connection or a blocked request. Reported as a failure rather
    // than swallowed, for the reason at the top of this file. The original
    // error is kept as `cause` so the console still shows what actually
    // happened.
    const failure = new ApiError(
      0,
      "Could not reach Turva. Check your connection and try again.",
      {},
    );
    failure.cause = cause;
    throw failure;
  }

  if (!response.ok) {
    throw await describeFailure(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
};
