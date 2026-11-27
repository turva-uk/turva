import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithRouter } from "@/test/test-utils";
import LogoutNavLink from "./LogoutNavLink";
import SideNav from "./SideNav";
import NavSublinkProvider from "./NavSublinkProvider";
import { isWithin } from "./navItems";
import { usePageSublink } from "./pageSublink";

/** A page that names its own sublink, as the organisation page does. */
function OrganisationPageStandIn() {
  usePageSublink({
    parent: "/organisations",
    to: "/organisations/riverbank",
    label: "Riverbank Health Federation",
  });

  return null;
}

describe("SideNav", () => {
  it("names the main navigation and lists its three links in order", () => {
    renderWithRouter(<SideNav onSignOut={() => undefined} />);

    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    const links = within(navigation).getAllByRole("link");

    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Safety files", "/safety-files"],
      ["Settings", "/settings"],
      ["Organisations", "/organisations"],
    ]);
  });

  it("shows a page's own sublink beneath its parent, marked as current", async () => {
    renderWithRouter(
      <NavSublinkProvider>
        <SideNav onSignOut={() => undefined} />
        <OrganisationPageStandIn />
      </NavSublinkProvider>,
      { initialRoute: "/organisations/riverbank" },
    );

    const organisation = await screen.findByRole("link", {
      name: "Riverbank Health Federation",
    });
    const navigation = screen.getByRole("navigation", { name: "Main navigation" });

    expect(
      within(navigation)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Safety files", "Settings", "Organisations", "Riverbank Health Federation"]);
    expect(organisation).toHaveAttribute("href", "/organisations/riverbank");
    expect(organisation).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Organisations" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("shows no page sublink outside a provider", () => {
    renderWithRouter(<SideNav onSignOut={() => undefined} />, {
      initialRoute: "/organisations/riverbank",
    });

    expect(
      screen.queryByRole("link", { name: "Riverbank Health Federation" }),
    ).not.toBeInTheDocument();
  });

  it("shows Your profile beneath Settings on a settings page, marked as current", () => {
    renderWithRouter(<SideNav onSignOut={() => undefined} />, {
      initialRoute: "/settings/profile",
    });

    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    const links = within(navigation).getAllByRole("link");
    const profile = screen.getByRole("link", { name: "Your profile" });

    expect(links.map((link) => link.textContent)).toEqual([
      "Safety files",
      "Settings",
      "Your profile",
      "Organisations",
    ]);
    expect(profile).toHaveAttribute("href", "/settings/profile");
    expect(profile).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Settings" })).not.toHaveAttribute("aria-current");
  });

  it("marks Settings on its own page, without the sublink its cards already offer", () => {
    renderWithRouter(<SideNav onSignOut={() => undefined} />, { initialRoute: "/settings" });

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("link", { name: "Your profile" })).not.toBeInTheDocument();
  });

  it("indents a sublink and leaves out its icon", () => {
    renderWithRouter(<SideNav onSignOut={() => undefined} />, {
      initialRoute: "/settings/profile",
    });

    const settings = screen.getByRole("link", { name: "Settings" });
    const profile = screen.getByRole("link", { name: "Your profile" });

    expect(settings.querySelector("svg")).not.toBeNull();
    expect(profile.querySelector("svg")).toBeNull();
    expect(profile.className).toMatch(/nested/);
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
    expect(screen.queryByRole("link", { name: "Your profile" })).not.toBeInTheDocument();
  });

  it("calls onNavigate when a link is followed, so the drawer can close", async () => {
    const onNavigate = vi.fn();
    renderWithRouter(<SideNav onSignOut={() => undefined} onNavigate={onNavigate} />);

    await userEvent.setup().click(screen.getByRole("link", { name: "Organisations" }));

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
