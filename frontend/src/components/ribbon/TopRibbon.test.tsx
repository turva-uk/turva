import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithRouter } from "@/test/test-utils";
import TopRibbon from "./TopRibbon";

describe("TopRibbon", () => {
  it("links the Turva name home", () => {
    renderWithRouter(<TopRibbon />);

    expect(screen.getByRole("link", { name: "Turva" })).toHaveAttribute("href", "/");
  });

  it("shows no burger and no navigation on a wide screen", () => {
    renderWithRouter(<TopRibbon />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows the burger on a narrow screen, and opens the drawer with it", async () => {
    const onBurgerClick = vi.fn();
    renderWithRouter(<TopRibbon showBurger onBurgerClick={onBurgerClick} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Open navigation" }));

    expect(onBurgerClick).toHaveBeenCalledOnce();
  });

  it("hides the Turva name while the burger shows, so the two never show together", () => {
    renderWithRouter(<TopRibbon showBurger onBurgerClick={() => undefined} />);

    expect(screen.queryByRole("link", { name: "Turva" })).not.toBeInTheDocument();
  });

  it("puts what it is given at the end of the ribbon", () => {
    renderWithRouter(<TopRibbon end={<button type="button">Inbox</button>} />);

    expect(screen.getByRole("button", { name: "Inbox" })).toBeInTheDocument();
  });

  it("offers to close the drawer while it is open", () => {
    renderWithRouter(<TopRibbon showBurger navOpen onBurgerClick={() => undefined} />);

    const burger = screen.getByRole("button", { name: "Close navigation" });

    expect(burger).toHaveAttribute("aria-expanded", "true");
  });
});
