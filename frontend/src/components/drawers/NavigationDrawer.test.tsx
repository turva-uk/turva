import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SideNav from "@/components/navigation/SideNav";
import { renderWithRouter } from "@/test/test-utils";
import NavigationDrawer from "./NavigationDrawer";

describe("NavigationDrawer", () => {
  it("shows the side bar when open", async () => {
    renderWithRouter(
      <NavigationDrawer opened onClose={() => undefined}>
        <SideNav onSignOut={() => undefined} />
      </NavigationDrawer>,
    );

    expect(
      await screen.findByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
  });

  it("shows nothing when closed", () => {
    renderWithRouter(
      <NavigationDrawer opened={false} onClose={() => undefined}>
        <SideNav onSignOut={() => undefined} />
      </NavigationDrawer>,
    );

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("closes from its own close button", async () => {
    const onClose = vi.fn();
    renderWithRouter(
      <NavigationDrawer opened onClose={onClose}>
        <SideNav onSignOut={() => undefined} />
      </NavigationDrawer>,
    );

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Close navigation" }));

    expect(onClose).toHaveBeenCalled();
  });
});
