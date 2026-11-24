import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithRouter } from "@/test/test-utils";
import LogoutNavLink from "./LogoutNavLink";
import SideNav from "./SideNav";
import { isWithin } from "./navItems";

describe("SideNav", () => {
  it("names the main navigation and lists its three links in order", () => {
    renderWithRouter(<SideNav onSignOut={() => undefined} />);

    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    const links = within(navigation).getAllByRole("link");

    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Safety files", "/safety-files"],
      ["Your profile", "/profile"],
      ["Organisations", "/organisations"],
    ]);
  });

  it("puts Sign out at the foot, inside the navigation", () => {
    renderWithRouter(<SideNav onSignOut={() => undefined} />);

    const navigation = screen.getByRole("navigation", { name: "Main navigation" });

    expect(within(navigation).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("marks the current section, including a page beneath it", () => {
    renderWithRouter(<SideNav onSignOut={() => undefined} />, {
      initialRoute: "/safety-files/demo-bp-at-home/hazards/HAZ-001",
    });

    expect(screen.getByRole("link", { name: "Safety files" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Your profile" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("calls onNavigate when a link is followed, so the drawer can close", async () => {
    const onNavigate = vi.fn();
    renderWithRouter(<SideNav onSignOut={() => undefined} onNavigate={onNavigate} />);

    await userEvent.setup().click(screen.getByRole("link", { name: "Your profile" }));

    expect(onNavigate).toHaveBeenCalledOnce();
  });
});

describe("isWithin", () => {
  it.each([
    ["/safety-files", "/safety-files", true],
    ["/safety-files/demo", "/safety-files", true],
    ["/safety-files-archive", "/safety-files", false],
    ["/profile", "/safety-files", false],
  ])("reads %s as within %s: %s", (pathname, to, expected) => {
    expect(isWithin(pathname, to)).toBe(expected);
  });
});

describe("LogoutNavLink", () => {
  it("signs out when pressed", async () => {
    const onSignOut = vi.fn();
    renderWithRouter(<LogoutNavLink onSignOut={onSignOut} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));

    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("says it is signing out, and cannot be pressed again meanwhile", async () => {
    const onSignOut = vi.fn();
    renderWithRouter(<LogoutNavLink onSignOut={onSignOut} signingOut />);

    const button = screen.getByRole("button", { name: "Signing out…" });
    await userEvent.setup().click(button);

    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(onSignOut).not.toHaveBeenCalled();
  });
});
