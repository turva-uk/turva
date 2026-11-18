import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import TextLink from "./TextLink";
import classes from "./TextLink.module.css";

describe("TextLink", () => {
  it("is 44px tall on phones when it stands on its own line", () => {
    renderWithRouter(
      <TextLink to="/forgot" standalone>
        Forgot password?
      </TextLink>,
    );
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveClass(
      classes.standalone ?? "missing-css-module-class",
    );
  });

  it("keeps its line height inside a sentence", () => {
    renderWithRouter(<TextLink to="/about">Learn more</TextLink>);
    expect(screen.getByRole("link", { name: "Learn more" })).not.toHaveClass(
      classes.standalone ?? "missing-css-module-class",
    );
  });
  it("renders children text", () => {
    renderWithRouter(<TextLink to="/register">Register</TextLink>);
    expect(screen.getByText("Register")).toBeInTheDocument();
  });

  it("renders as a link", () => {
    renderWithRouter(<TextLink to="/about">Learn more</TextLink>);
    const link = screen.getByRole("link", { name: "Learn more" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/about");
  });

  it("uses Mantine Anchor styling", () => {
    renderWithRouter(<TextLink to="/register">Sign up</TextLink>);
    const link = screen.getByRole("link", { name: "Sign up" });
    expect(link).toHaveClass("mantine-Anchor-root");
  });

  it("calls onClick when followed", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithRouter(
      <TextLink to="/feedback" onClick={onClick}>
        Your feedback
      </TextLink>,
    );

    await user.click(screen.getByRole("link", { name: "Your feedback" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
