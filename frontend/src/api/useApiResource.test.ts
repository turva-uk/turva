import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { useApiResource } from "./useApiResource";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

it("never returns the previous path's data, including the render before effects run", async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.endsWith("/first/")
        ? json({ name: "First file" })
        : new Promise<Response>((resolve) => {
            finish = resolve;
          }),
    ),
  );
  const renders: { path: string; name?: string }[] = [];
  const { result, rerender } = renderHook(
    ({ path }) => {
      const resource = useApiResource<{ name: string }>(path);
      renders.push({ path, name: resource.data?.name });
      return resource;
    },
    { initialProps: { path: "/first/" } },
  );
  await waitFor(() => expect(result.current.data?.name).toBe("First file"));
  rerender({ path: "/second/" });
  expect(result.current.loading).toBe(true);
  expect(
    renders
      .filter((entry) => entry.path === "/second/")
      .every((entry) => entry.name === undefined),
  ).toBe(true);
  await act(async () => {
    finish(json({ name: "Second file" }));
  });
  await waitFor(() => expect(result.current.data?.name).toBe("Second file"));
});

it("ignores slow responses from an aborted path and clears old errors on navigation", async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/slow/"))
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      if (url.endsWith("/broken/")) return json({ detail: "Unavailable evidence" }, 503);
      return json({ name: "Latest file" });
    }),
  );
  const { result, rerender } = renderHook(
    ({ path }) => useApiResource<{ name: string }>(path),
    {
      initialProps: { path: "/slow/" },
    },
  );
  rerender({ path: "/broken/" });
  await waitFor(() => expect(result.current.error).toBe("Unavailable evidence"));
  rerender({ path: "/latest/" });
  expect(result.current.error).toBeNull();
  await waitFor(() => expect(result.current.data?.name).toBe("Latest file"));
  await act(async () => {
    finish(json({ name: "Old file" }));
  });
  expect(result.current.data?.name).toBe("Latest file");
});
