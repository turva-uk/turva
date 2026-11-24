import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SessionProvider } from "../auth/SessionProvider";
import { cssVariablesResolver, theme } from "../theme";
import { LoginPage } from "./LoginPage";
import { PasswordResetRequestPage } from "./PasswordResetPage";
import { RegistrationPage } from "./RegistrationPage";

/**
 * The account pages in a data router, as the app has: `Form` only guards
 * leaving the page inside one.
 */
function start(path: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ authenticated: false, user: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );

  const router = createMemoryRouter(
    [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegistrationPage /> },
      { path: "/password-reset", element: <PasswordResetRequestPage /> },
    ].map((route) => ({
      ...route,
      element: <SessionProvider>{route.element}</SessionProvider>,
    })),
    { initialEntries: [path] },
  );

  render(
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <RouterProvider router={router} />
    </MantineProvider>,
  );

  return { router, actor: userEvent.setup() };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("leaving an account page with something typed", () => {
  it("asks first on the registration page", async () => {
    const { router, actor } = start("/register");

    await actor.type(await screen.findByRole("textbox", { name: "First name" }), "Anita");
    await actor.click(screen.getByRole("link", { name: "Already have an account? Sign in" }));

    expect(await screen.findByRole("dialog", { name: "Leave this page?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/register");
  });

  it("asks first on the password reset page", async () => {
    const { router, actor } = start("/password-reset");

    await actor.type(
      await screen.findByRole("textbox", { name: "Email address" }),
      "a.patel@riverbank.example.nhs.uk",
    );
    await actor.click(screen.getByRole("link", { name: "Back to sign in" }));

    expect(await screen.findByRole("dialog", { name: "Leave this page?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/password-reset");
  });

  it("does not ask on the sign-in page", async () => {
    const { actor } = start("/login");

    await actor.type(
      await screen.findByRole("textbox", { name: "Email address" }),
      "a.patel@riverbank.example.nhs.uk",
    );
    await actor.click(screen.getByRole("link", { name: "Create an account" }));

    expect(
      await screen.findByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Leave this page?" })).not.toBeInTheDocument();
  });
});
