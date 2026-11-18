/**
 * BaseCard Component Tests
 *
 * Tests for the standardised card wrapper:
 * - Renders children
 * - Renders as a Mantine Card (section element)
 * - Forwards extra props
 */

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import BaseCard from "./BaseCard";

describe("BaseCard", () => {
  it("renders children", () => {
    renderWithMantine(<BaseCard>Hello world</BaseCard>);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders with fixed styling without error", () => {
    renderWithMantine(<BaseCard data-testid="default">Content</BaseCard>);
    expect(screen.getByTestId("default")).toBeInTheDocument();
  });

  it("forwards data-testid", () => {
    renderWithMantine(<BaseCard data-testid="my-card">Content</BaseCard>);
    expect(screen.getByTestId("my-card")).toBeInTheDocument();
  });

  it("forwards onClick handler", () => {
    let clicked = false;
    renderWithMantine(
      <BaseCard data-testid="clickable" onClick={() => (clicked = true)}>
        Content
      </BaseCard>,
    );
    screen.getByTestId("clickable").click();
    expect(clicked).toBe(true);
  });

  it("removes border when bg is set", () => {
    renderWithMantine(
      <BaseCard data-testid="bg-card" bg="var(--success-color)">
        Content
      </BaseCard>,
    );
    const card = screen.getByTestId("bg-card");
    expect(card).not.toHaveStyle({
      borderColor: "var(--mantine-color-gray-2)",
    });
  });

  it("defaults to white text on a coloured background", () => {
    renderWithMantine(
      <BaseCard data-testid="bg-card" bg="var(--success-color)">
        Content
      </BaseCard>,
    );
    // The inline style, because jsdom resolves only the variables the theme defines.
    expect(screen.getByTestId("bg-card").style.color).toBe("var(--mantine-color-white)");
  });

  it("lets an explicit text colour override that default", () => {
    // White was forced on any coloured card, which made a pale
    // background unreadable - the text vanished into it. The default
    // stays for saturated fills; a caller that knows better wins.
    renderWithMantine(
      <BaseCard data-testid="bg-card" bg="var(--update-color)" c="var(--status-text-dark)">
        Content
      </BaseCard>,
    );
    // The inline style, because jsdom resolves only the variables the theme defines.
    expect(screen.getByTestId("bg-card").style.color).toBe("var(--status-text-dark)");
  });

  it("breaks a word longer than the card, unless told not to", () => {
    // The stylesheet keys on this attribute. jsdom does no layout, so the
    // attribute is what can be checked here; the Long word story shows it.
    renderWithMantine(<BaseCard data-testid="card">Content</BaseCard>);

    expect(screen.getByTestId("card")).toHaveAttribute("data-wrap-long-words");
  });

  it("leaves long words alone when wrapLongWords is off", () => {
    renderWithMantine(
      <BaseCard data-testid="card" wrapLongWords={false}>
        Content
      </BaseCard>,
    );

    expect(screen.getByTestId("card")).not.toHaveAttribute("data-wrap-long-words");
  });

  it("keeps a class name it is given beside its own", () => {
    renderWithMantine(
      <BaseCard data-testid="card" className="mine">
        Content
      </BaseCard>,
    );

    const card = screen.getByTestId("card");
    expect(card).toHaveClass("mine");
    expect(card.className.split(" ").length).toBeGreaterThan(1);
  });

  it("preserves object styles and lets them override the wrapper defaults", () => {
    renderWithMantine(
      <BaseCard data-testid="card" style={{ overflow: "hidden", textTransform: "uppercase" }}>
        Content
      </BaseCard>,
    );
    expect(screen.getByTestId("card").style.overflow).toBe("hidden");
    expect(screen.getByTestId("card").style.textTransform).toBe("uppercase");
  });

  it("passes theme callbacks to Mantine rather than discarding them", () => {
    renderWithMantine(
      <BaseCard
        data-testid="card"
        style={(theme) => ({ color: theme.colors["primary"]?.[8], textTransform: "uppercase" })}
      >
        Content
      </BaseCard>,
    );
    const card = screen.getByTestId("card");
    expect(card.style.color).toBe("rgb(84, 80, 124)");
    expect(card.style.textTransform).toBe("uppercase");
    expect(card.style.overflow).toBe("visible");
  });

  it("accepts nested style arrays and applies later entries last", () => {
    renderWithMantine(
      <BaseCard
        data-testid="card"
        style={[
          { overflow: "hidden", textTransform: "lowercase" },
          [undefined, (theme) => ({ color: theme.colors["primary"]?.[8] })],
          { textTransform: "uppercase" },
        ]}
      >
        Content
      </BaseCard>,
    );
    const card = screen.getByTestId("card");
    expect(card.style.overflow).toBe("hidden");
    expect(card.style.textTransform).toBe("uppercase");
    expect(card.style.color).toBe("rgb(84, 80, 124)");
  });
});
