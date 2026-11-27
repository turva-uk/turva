/**
 * Turn a failed API call into what a shared `Form` shows.
 *
 * The API client throws `ApiError` for every refused request. Its message
 * goes in the form's status card, and the messages it carries for named
 * fields go under those fields, so somebody can see which entry to change.
 * The draft is kept either way: an error never resets a `Form`.
 */

import type { FieldPath, FieldValues } from "react-hook-form";

import { ApiError } from "@/api/client";
import type { FormSubmitResult } from "@/components/form/Form";

/**
 * The result for a refused request.
 *
 * Only messages for the form's own `fields` are placed under a field. Any
 * other field message is added to the status card's description, so
 * nothing the server said is dropped.
 *
 * Anything other than an `ApiError`, such as a network failure, is thrown
 * on, and `Form` shows its own "Something went wrong" message.
 *
 * @param error - What the API call threw
 * @param title - The status card's title, such as "Could not sign you in"
 * @param fields - The form's field names, as the server names them
 * @returns An `error` result for `Form`'s `onSubmit` to return
 */
export function apiFailure<T extends FieldValues>(
  error: unknown,
  title: string,
  fields: readonly FieldPath<T>[],
): FormSubmitResult<T> {
  if (!(error instanceof ApiError)) throw error;

  const fieldErrors: Partial<Record<FieldPath<T>, string>> = {};
  const elsewhere: string[] = [];

  for (const [name, messages] of Object.entries(error.fieldErrors)) {
    const field = fields.find((candidate) => candidate === name);
    if (field) fieldErrors[field] = messages.join(" ");
    else elsewhere.push(...messages);
  }

  const description = [error.message, ...elsewhere.filter((line) => line !== error.message)]
    .filter(Boolean)
    .join(" ");

  return { state: "error", message: { title, description }, fieldErrors };
}
