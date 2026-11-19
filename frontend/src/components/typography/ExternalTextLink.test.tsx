import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import ExternalTextLink from "./ExternalTextLink";
import classes from "./TextLink.module.css";

describe("ExternalTextLink", () => {
  it("links to the address it is given", () => {
    renderWithMantine(
      <ExternalTextLink href="https://example.com/policy">privacy policy</ExternalTextLink>,
    );
    expect(screen.getByRole("link", { name: /privacy policy/ })).toHaveAttribute(
      "href",
      "https://example.com/policy",
    );
  });

  it("opens in a new tab without handing the page a way back", () => {
    renderWithMantine(
      <ExternalTextLink href="https://example.com/policy">privacy policy</ExternalTextLink>,
    );
    const link = screen.getByRole("link", { name: /privacy policy/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("tells a screen reader that it opens in a new tab", () => {
    renderWithMantine(
      <ExternalTextLink href="https://example.com/policy">privacy policy</ExternalTextLink>,
    );
    // The name is worked out here without the space that opens the hidden
    // words, which a browser keeps, so the space is not asserted.
    expect(
      screen.getByRole("link", {
        name: /^privacy policy\s?\(opens in a new tab\)$/,
      }),
    ).toBeInTheDocument();
  });

  it("looks the same as an internal text link", () => {
    renderWithMantine(
      <ExternalTextLink href="https://example.com/policy">privacy policy</ExternalTextLink>,
    );
    const link = screen.getByRole("link", { name: /privacy policy/ });
    expect(link).toHaveClass("mantine-Anchor-root");
    expect(link).toHaveClass(classes.link ?? "missing-css-module-class");
  });
});
