import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { createMemoryRouter, RouterProvider } from "react-router";
import userEvent from "@testing-library/user-event";

import { renderWithRouter } from "@/test/test-utils";
import { cssVariablesResolver, theme } from "@/theme";
import MainLayout from "./MainLayout";
import classes from "./MainLayout.module.css";
import { LAYOUT_RIBBON_HEIGHT } from "./layoutConstants";

/** Make the screen read as narrow, below `md`, or wide. */
function screenIs(width: "narrow" | "wide") {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: width === "narrow" && query.includes("max-width"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MainLayout", () => {
  it("puts the page in main, where the skip link points", () => {
    screenIs("wide");
    renderWithRouter(
      <MainLayout signedIn={false} onSignOut={() => undefined}>
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveTextContent("The page");
  });

  it("shows the ribbon alone to somebody signed out", () => {
    screenIs("wide");
    renderWithRouter(
      <MainLayout signedIn={false} onSignOut={() => undefined}>
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.getByRole("link", { name: "Turva" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open navigation" })).not.toBeInTheDocument();
  });

  it("shows the side bar on a wide screen, with no burger", () => {
    screenIs("wide");
    renderWithRouter(
      <MainLayout signedIn onSignOut={() => undefined}>
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open navigation" })).not.toBeInTheDocument();
  });

  it("folds the side bar behind the burger on a narrow screen, and opens it as a drawer", async () => {
    screenIs("narrow");
    renderWithRouter(
      <MainLayout signedIn onSignOut={() => undefined}>
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Open navigation" }));

    expect(
      await screen.findByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
  });
});

describe("MainLayout's envelope and footer", () => {
  it("shows the envelope and says who is signed in", () => {
    screenIs("wide");
    renderWithRouter(
      <MainLayout signedIn onSignOut={() => undefined} signedInAs="Dr Anita Patel">
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.getByRole("button", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Signed in as Dr Anita Patel");
  });

  it("shows neither to somebody signed out", () => {
    screenIs("wide");
    renderWithRouter(
      <MainLayout signedIn={false} onSignOut={() => undefined}>
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.queryByRole("button", { name: "Inbox" })).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("hides the Turva name on a narrow screen, where the burger shows", () => {
    screenIs("narrow");
    renderWithRouter(
      <MainLayout signedIn onSignOut={() => undefined} signedInAs="Dr Anita Patel">
        <p>The page</p>
      </MainLayout>,
    );

    expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Turva" })).not.toBeInTheDocument();
  });

  it("opens the inbox from the envelope", async () => {
    screenIs("wide");
    const router = createMemoryRouter(
      ["/safety-files", "/inbox"].map((path) => ({
        path,
        element: (
          <MainLayout signedIn onSignOut={() => undefined} signedInAs="Dr Anita Patel">
            <p>{path === "/inbox" ? "The inbox page" : "The safety files page"}</p>
          </MainLayout>
        ),
      })),
      { initialEntries: ["/safety-files"] },
    );
    render(
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
        <RouterProvider router={router} />
      </MantineProvider>,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Inbox" }));

    expect(await screen.findByText("The inbox page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/inbox");
  });
});

describe("MainLayout's side bar with more links than fit", () => {
  // jsdom lays nothing out, so this reads the rule itself. Without it the
  // fixed side bar ran its last links and "Sign out" off the bottom of a
  // short screen, out of reach.
  it("scrolls the side bar on its own", () => {
    const layoutCss = fs.readFileSync(
      path.join(import.meta.dirname, "MainLayout.module.css"),
      "utf8",
    );
    const navbarRule = /\.shell \.navbar \{([^}]*)\}/.exec(layoutCss)?.[1] ?? "";

    expect(navbarRule).toContain("overflow-y: auto");
  });
});

describe("MainLayout's ribbon height", () => {
  it("gives the shell's header the shared ribbon height, as the ribbon's stories use", () => {
    screenIs("wide");
    renderWithRouter(
      <MainLayout signedIn onSignOut={() => undefined} signedInAs="Dr Anita Patel">
        <p>The page</p>
      </MainLayout>,
    );

    const styles = Array.from(document.querySelectorAll("style"))
      .map((element) => element.textContent ?? "")
      .join("\n");

    expect(LAYOUT_RIBBON_HEIGHT).toBe(70);
    // Mantine writes pixels as rem, scaled: 70px is 4.375rem.
    expect(styles).toContain(`--app-shell-header-height:calc(${LAYOUT_RIBBON_HEIGHT / 16}rem`);
  });
});

describe("MainLayout's footer beside the side bar", () => {
  // jsdom lays nothing out, so these check the slots carry the rules that
  // start the footer at the side bar's edge and run the side bar to the
  // bottom of the screen. The pull request's screenshots show the result.
  it("gives the shell, footer and side bar their layout classes", () => {
    screenIs("wide");
    const { container } = renderWithRouter(
      <MainLayout signedIn onSignOut={() => undefined} signedInAs="Dr Anita Patel">
        <p>The page</p>
      </MainLayout>,
    );

    const missing = "missing-css-module-class";
    const footerSlot = screen.getByRole("contentinfo").parentElement;
    const shell = container.querySelector(`.${classes.shell ?? missing}`);

    expect(footerSlot).toHaveClass(classes.footer ?? missing);
    expect(shell).not.toBeNull();
    expect(shell?.querySelector(`.${classes.navbar ?? missing}`)).toContainElement(
      screen.getByRole("button", { name: "Sign out" }),
    );
  });
});
