import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from "react-router";
import { describe, expect, it } from "vitest";

import { renderWithMantine } from "@/test/test-utils";
import { PageMessageProvider, usePageMessage, usePageMessageSlot } from "./PageMessageContext";

const flash = {
  variant: "success",
  title: "Hazard saved",
  description: "Recorded in the safety file",
};
const initialEntry = {
  pathname: "/hazards",
  search: "?status=open",
  hash: "#haz-001",
  state: { flash, returnTo: "/safety-files/demo", selectedHazard: "HAZ-001" },
};

function Probe() {
  const { messages, showMessage, dismiss, clearAll } = usePageMessage();
  const location = useLocation();
  return (
    <>
      <output data-testid="messages">{JSON.stringify(messages)}</output>
      <output data-testid="location">{JSON.stringify(location)}</output>
      <button onClick={() => showMessage({ variant: "error", title: "Save failed" })}>
        Show error
      </button>
      <button
        onClick={() => {
          if (messages[0]) dismiss(messages[0].id);
        }}
      >
        Dismiss first
      </button>
      <button onClick={clearAll}>Clear all</button>
    </>
  );
}

function messages() {
  return JSON.parse(screen.getByTestId("messages").textContent || "[]") as {
    id: string;
    title: string;
  }[];
}

function renderProvider(entry = initialEntry) {
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <PageMessageProvider>
            <Probe />
          </PageMessageProvider>
        ),
      },
    ],
    { initialEntries: [entry] },
  );
  renderWithMantine(<RouterProvider router={router} />, { reactStrictMode: true });
  return router;
}

describe("page messages", () => {
  // Page feedback must remain accurate without changing the opened resource
  // or discarding unrelated navigation context (TH-001).
  it.each(["data", "declarative"])(
    "consumes an initial flash once under root StrictMode (%s router)",
    async (kind) => {
      if (kind === "data") renderProvider();
      else
        renderWithMantine(
          <MemoryRouter initialEntries={[initialEntry]}>
            <PageMessageProvider>
              <Probe />
            </PageMessageProvider>
          </MemoryRouter>,
          { reactStrictMode: true },
        );
      await waitFor(() => expect(messages()).toHaveLength(1));
      expect(messages()[0]).toMatchObject(flash);
      const location = JSON.parse(screen.getByTestId("location").textContent || "{}");
      expect(location).toMatchObject({
        pathname: "/hazards",
        search: "?status=open",
        hash: "#haz-001",
        state: { returnTo: "/safety-files/demo", selectedHazard: "HAZ-001" },
      });
      expect(location.state).not.toHaveProperty("flash");
    },
  );

  it("preserves a fragment and unrelated navigation state while consuming flash", async () => {
    const router = renderProvider();
    await waitFor(() => expect(router.state.location.state).not.toHaveProperty("flash"));
    expect(router.state.location).toMatchObject({
      pathname: "/hazards",
      search: "?status=open",
      hash: "#haz-001",
      state: { returnTo: "/safety-files/demo", selectedHazard: "HAZ-001" },
    });
  });

  it("replaces the history entry and does not replay a flash on back navigation", async () => {
    const router = renderProvider();
    await waitFor(() => expect(messages()).toHaveLength(1));
    expect(router.state.historyAction).toBe("REPLACE");
    await act(async () => {
      await router.navigate("/other");
    });
    expect(messages()).toHaveLength(0);
    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe("/hazards");
    expect(messages()).toHaveLength(0);
  });

  it("accepts identical flash content from distinct navigations with unique message IDs", async () => {
    const router = renderProvider();
    await waitFor(() => expect(messages()).toHaveLength(1));
    await act(async () => {
      await router.navigate("/hazards?status=closed#haz-002", { state: { flash } });
    });
    expect(messages()).toHaveLength(2);
    expect(new Set(messages().map((message) => message.id)).size).toBe(2);
    expect(router.state.location.hash).toBe("#haz-002");
  });

  it("clears the old page's messages before ingesting the new page's flash", async () => {
    const router = renderProvider();
    await waitFor(() => expect(messages()).toHaveLength(1));
    await act(async () => {
      await router.navigate("/other", { state: { flash: { title: "Mitigation saved" } } });
    });
    expect(messages()).toHaveLength(1);
    expect(messages()).toMatchObject([{ title: "Mitigation saved" }]);
  });

  it("retains messages across query/fragment changes until dismissed or the pathname changes", async () => {
    const user = userEvent.setup();
    const router = renderProvider();
    await waitFor(() => expect(messages()).toHaveLength(1));
    await act(async () => {
      await router.navigate("/hazards?status=closed#haz-002");
    });
    expect(messages()).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Show error" }));
    expect(messages()).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Dismiss first" }));
    expect(messages().map((message) => message.title)).toEqual(["Save failed"]);
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(messages()).toHaveLength(0);
  });

  it("registers a single header slot under StrictMode and transfers it when the first header leaves", async () => {
    function Header({ name }: { name: string }) {
      const active = usePageMessageSlot();
      return <output data-testid={name}>{String(active)}</output>;
    }
    const content = (first: boolean) => (
      <MemoryRouter>
        <PageMessageProvider>
          {first && <Header name="first" />}
          <Header name="second" />
        </PageMessageProvider>
      </MemoryRouter>
    );
    const { rerender } = renderWithMantine(content(true), { reactStrictMode: true });
    expect(screen.getByTestId("first")).toHaveTextContent("true");
    expect(screen.getByTestId("second")).toHaveTextContent("false");
    rerender(content(false));
    expect(screen.getByTestId("second")).toHaveTextContent("true");
  });
});
