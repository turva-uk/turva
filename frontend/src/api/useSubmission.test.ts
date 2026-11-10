import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { useSubmission } from "./useSubmission";

it("permits only one in-flight save and unlocks after completion", async () => {
  const { result } = renderHook(useSubmission);
  let finish!: () => void;
  const action = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  let first!: Promise<void>;
  act(() => {
    first = result.current.run(action);
  });
  expect(result.current.submitting).toBe(true);
  await act(() => result.current.run(action));
  expect(action).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish();
    await first;
  });
  expect(result.current.submitting).toBe(false);
  await act(() => result.current.run(async () => {}));
  expect(result.current.failure).toBeNull();
});
