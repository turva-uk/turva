import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";

import { App } from "../App";
import type { User } from "../api/types";
import { SessionProvider } from "../auth/SessionProvider";

const person: User = {
  id: "demo-user",
  email: "new@riverbank.example.nhs.uk",
  first_name: "Sarah",
  last_name: "Whitlock",
  full_name: "Sarah Whitlock",
  organisation: "Riverbank",
  job_role: "",
  professional_regulator: "",
  registration_number: "",
  professional_registration: "",
  registration_verified: false,
  is_cso: false,
  cso_declared_at: null,
  is_verified: false,
  is_staff: false,
};
const password = "fictional-test-password-82";
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function start(
  path: string,
  initial: User | null = null,
  write?: (url: string, init: RequestInit) => Response,
) {
  let current = initial;
  const writes: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (init.method === "GET") {
        if (url.endsWith("/auth/session/"))
          return json({ authenticated: !!current, user: current });
        if (url.endsWith("/safety-files/")) return json([]);
        throw new Error(`Unexpected GET ${url}`);
      }
      writes.push(url);
      if (write) return write(url, init);
      if (url.endsWith("/auth/register/")) {
        current = person;
        return json(
          { authenticated: true, user: current, confirmation_email_sent: false },
          201,
        );
      }
      if (url.endsWith("/auth/verify/")) {
        current = { ...person, is_verified: true };
        return json({ detail: "Email confirmed." });
      }
      if (url.endsWith("/auth/verify/resend/"))
        return json({ detail: "Wait ten minutes before requesting another email." }, 429);
      if (url.endsWith("/auth/password-reset/"))
        return json(
          { detail: "If an active account exists, a password reset email will be sent." },
          202,
        );
      if (url.endsWith("/auth/password-reset/confirm/")) {
        current = null;
        return json({ detail: "Password changed." });
      }
      throw new Error(`Unexpected write ${url}`);
    }),
  );
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <SessionProvider>
          <App />
        </SessionProvider>
      </MemoryRouter>
    </MantineProvider>,
  );
  return { actor: userEvent.setup(), writes };
}

it("registers, preserves the new session and reports failed email delivery honestly", async () => {
  const { actor, writes } = start("/register");
  await actor.type(await screen.findByRole("textbox", { name: "Email address" }), person.email);
  await actor.type(screen.getByRole("textbox", { name: "First name" }), person.first_name);
  await actor.type(screen.getByRole("textbox", { name: "Last name" }), person.last_name);
  await actor.type(screen.getByLabelText(/^Password/, { selector: "input" }), password);
  await actor.type(screen.getByLabelText(/^Confirm password/, { selector: "input" }), password);
  await actor.click(screen.getByRole("button", { name: "Create account" }));
  await screen.findByRole("heading", { name: "Confirm your email address" });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Account created, but email delivery failed",
  );
  expect(writes).toHaveLength(1);
  await actor.click(screen.getByRole("button", { name: "Resend confirmation email" }));
  expect(
    await screen.findByText(/Wait ten minutes before requesting another email/),
  ).toBeInTheDocument();
});

it("gates an unverified account before fetching safety evidence", async () => {
  start("/safety-files", person);
  await screen.findByRole("heading", { name: "Confirm your email address" });
  expect(
    vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith("/safety-files/")),
  ).toBe(false);
});

it("only confirms an email after an explicit action, not just opening the link", async () => {
  const { actor, writes } = start("/accounts/verify/demo-user/token/", person);
  const button = await screen.findByRole("button", { name: "Confirm email address" });
  expect(writes).toHaveLength(0);
  await actor.click(button);
  expect(await screen.findByRole("status")).toHaveTextContent("Email address confirmed");
  expect(writes).toEqual(["/api/v1/auth/verify/"]);
});

it("shows the non-enumerating reset request response", async () => {
  const { actor } = start("/password-reset");
  await actor.type(
    await screen.findByRole("textbox", { name: "Email address" }),
    "unknown@example.org",
  );
  await actor.click(screen.getByRole("button", { name: "Request password reset" }));
  expect(await screen.findByRole("status")).toHaveTextContent("If an active account exists");
});

it("checks matching passwords and completes a password reset without automatic login", async () => {
  const { actor, writes } = start("/accounts/password-reset/encoded-user/token/");
  await actor.type(
    await screen.findByLabelText(/^New password/, { selector: "input" }),
    password,
  );
  const confirm = screen.getByLabelText(/^Confirm new password/, { selector: "input" });
  await actor.type(confirm, "different");
  await actor.click(screen.getByRole("button", { name: "Change password" }));
  expect(writes).toHaveLength(0);
  expect(screen.getByText("The passwords do not match.")).toBeInTheDocument();
  await actor.clear(confirm);
  await actor.type(confirm, password);
  await actor.click(screen.getByRole("button", { name: "Change password" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Password changed");
  expect(screen.getByRole("link", { name: "Sign in with your new password" })).toHaveAttribute(
    "href",
    "/login",
  );
});

it("does not pretend to sign out when the server logout fails", async () => {
  const { actor } = start("/safety-files", { ...person, is_verified: true }, () =>
    json({ detail: "Network unavailable. Try again." }, 503),
  );
  await screen.findByRole("heading", { name: "Your safety files" });
  await actor.click(screen.getByRole("button", { name: "Sign out" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("You have not been signed out");
  expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Sign in" })).not.toBeInTheDocument();
});
