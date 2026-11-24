import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import type { User } from "./api/types";
import { SessionProvider } from "./auth/SessionProvider";
import { cssVariablesResolver, theme } from "./theme";

const person: User = {
  id: "demo-user",
  email: "a.patel@riverbank.example.nhs.uk",
  first_name: "Anita",
  last_name: "Patel",
  full_name: "Anita Patel",
  organisation: "Riverbank Health Federation",
  job_role: "Clinical Safety Officer",
  professional_regulator: "GMC",
  registration_number: "7654321",
  professional_registration: "GMC 7654321",
  registration_verified: false,
  is_cso: true,
  cso_declared_at: "2026-11-10T12:00:00Z",
  is_verified: true,
  is_staff: false,
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** Render the whole app at a path, with the session call answered by `session`. */
function start(path: string, session: () => Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/auth/session/")) return session();

      return json({ results: [], safety_files: [] });
    }),
  );

  // A data router, as `main.tsx` uses: the shared `Form` refuses to render
  // outside one.
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <SessionProvider>
            <App />
          </SessionProvider>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <RouterProvider router={router} />
    </MantineProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the app shell", () => {
  it("shows the page spinner while it checks the session", () => {
    start("/profile", () => new Promise<Response>(() => undefined));

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
  });

  it("has a skip link that reaches the main content", () => {
    start("/login", async () => json({ user: null, authenticated: false }));

    const skip = screen.getByRole("link", { name: "Skip to content" });

    expect(skip).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("shows the main navigation once somebody is signed in", async () => {
    start("/profile", async () => json({ user: person, authenticated: true }));

    expect(
      await screen.findByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
