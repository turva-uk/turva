/**
 * disabled-controls.css gives every disabled Mantine control the ordinary
 * pointer, in place of Mantine's "not allowed" sign. It selects by
 * Mantine's static `mantine-…` class names and by state, and jsdom does
 * not load the stylesheet, so these tests guard the other half: that the
 * controls the rule is meant to reach still carry a class and a state it
 * selects. The shared button and form components add their own cases as
 * they arrive.
 */

import fs from "node:fs";
import path from "node:path";

import { ActionIcon, Button, Checkbox, Group, Switch, TextInput } from "@mantine/core";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithMantine } from "@/test/test-utils";

/**
 * The selectors of the rule, read from the stylesheet. Those jsdom cannot
 * parse, the `:has()` ones, are left out: none of them is about a
 * control's neighbour.
 */
function ruleSelectors(): string[] {
  const css = fs
    .readFileSync(path.join(import.meta.dirname, "disabled-controls.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const list = css.slice(0, css.indexOf("{"));

  return list
    .split(",")
    .map((selector) => selector.trim())
    .filter((selector) => {
      try {
        document.querySelector(selector);
        return true;
      } catch {
        return false;
      }
    });
}

/** Whether any selector of the rule reaches *element*. */
function ruleReaches(element: Element): boolean {
  return ruleSelectors().some((selector) => element.matches(selector));
}

describe("disabled-controls.css selectors", () => {
  it("reaches a disabled button", () => {
    renderWithMantine(<Button disabled>Sending…</Button>);

    const button = screen.getByRole("button", { name: "Sending…" });
    expect(button).toHaveClass("mantine-Button-root");
    expect(ruleReaches(button)).toBe(true);
  });

  it("reaches a button that is busy", () => {
    renderWithMantine(<Button loading>Save</Button>);

    const button = screen.getByRole("button", { name: /Save/ });
    expect(ruleReaches(button)).toBe(true);
  });

  it("reaches a disabled icon button", () => {
    renderWithMantine(
      <ActionIcon aria-label="Refresh" disabled>
        R
      </ActionIcon>,
    );

    const button = screen.getByRole("button", { name: "Refresh" });
    expect(button).toHaveClass("mantine-ActionIcon-root");
    expect(ruleReaches(button)).toBe(true);
  });

  it("leaves an enabled button after a disabled one its own cursor", () => {
    renderWithMantine(
      <Group>
        <ActionIcon aria-label="Back" disabled>
          B
        </ActionIcon>
        <ActionIcon aria-label="Next">N</ActionIcon>
      </Group>,
    );

    expect(ruleReaches(screen.getByRole("button", { name: "Back" }))).toBe(true);
    expect(ruleReaches(screen.getByRole("button", { name: "Next" }))).toBe(false);
  });

  it("still reaches what is drawn just after a disabled switch", () => {
    renderWithMantine(<Switch aria-label="Notify me" disabled />);

    const input = screen.getByRole("switch", { name: "Notify me" });
    const drawn = input.nextElementSibling;

    expect(drawn).not.toBeNull();
    expect(drawn !== null && ruleReaches(drawn)).toBe(true);
  });

  it("reaches a disabled checkbox and text input", () => {
    renderWithMantine(
      <>
        <Checkbox label="Agree" disabled />
        <TextInput label="Name" disabled />
      </>,
    );

    expect(ruleReaches(screen.getByRole("checkbox", { name: "Agree" }))).toBe(true);
    expect(ruleReaches(screen.getByLabelText("Name"))).toBe(true);
  });
});
