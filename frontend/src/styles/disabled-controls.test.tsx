/**
 * disabled-controls.css gives every disabled Mantine control the ordinary
 * pointer, in place of Mantine's "not allowed" sign. It selects by
 * Mantine's static `mantine-…` class names and by state, and jsdom does
 * not load the stylesheet, so these tests guard the other half: that the
 * controls the rule is meant to reach still carry a class and a state it
 * selects, and that the shared buttons do not ask for the sign themselves.
 */

import fs from "node:fs";
import path from "node:path";

import { ActionIcon, Button, Checkbox, Group, Switch, TextInput } from "@mantine/core";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ActionCardButton from "@/components/button/ActionCardButton";
import AddButton from "@/components/button/AddButton";
import ButtonPair from "@/components/button/ButtonPair";
import ButtonPairRed from "@/components/button/ButtonPairRed";
import IconTextButton from "@/components/button/IconTextButton";
import PreviousNextButton from "@/components/button/PreviousNextButton";
import PublicButton from "@/components/button/PublicButton";
import CheckboxField from "@/components/form/CheckboxField";
import SolidSwitch from "@/components/form/SolidSwitch";
import TextField from "@/components/form/TextField";
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

describe("the shared buttons keep the ordinary pointer when disabled", () => {
  it("reaches a disabled action card button", () => {
    renderWithMantine(<ActionCardButton label="Sending…" onClick={vi.fn()} disabled />);

    const button = screen.getByRole("button", { name: "Sending…" });
    expect(button).toHaveClass("mantine-Button-root");
    expect(button).toBeDisabled();
  });

  // Each of these styles its own disabled state, so each could bring the
  // "no entry" sign back by itself. One case apiece.
  it("IconTextButton", () => {
    renderWithMantine(<IconTextButton icon="refresh" label="Sync all" disabled />);

    expect(screen.getByRole("button", { name: "Sync all" }).style.cursor).toBe("default");
  });

  it("AddButton", () => {
    renderWithMantine(<AddButton label="Add hazard" onClick={vi.fn()} disabled />);

    expect(screen.getByRole("button", { name: "Add hazard" }).style.cursor).toBe("default");
  });

  it("PublicButton", () => {
    renderWithMantine(
      <PublicButton onClick={vi.fn()} disabled>
        Send
      </PublicButton>,
    );

    expect(screen.getByRole("button", { name: "Send" }).style.cursor).toBe("default");
  });

  it("ButtonPair", () => {
    renderWithMantine(<ButtonPair onAccept={vi.fn()} onCancel={vi.fn()} acceptDisabled />);

    const disabled = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-disabled") === "true");

    expect(disabled.length).toBeGreaterThan(0);
    disabled.forEach((button) => expect(button.style.cursor).toBe("default"));
  });

  it("ButtonPairRed", () => {
    renderWithMantine(<ButtonPairRed onAccept={vi.fn()} onCancel={vi.fn()} acceptDisabled />);

    const disabled = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-disabled") === "true");

    expect(disabled.length).toBeGreaterThan(0);
    disabled.forEach((button) => expect(button.style.cursor).toBe("default"));
  });

  it("PreviousNextButton", () => {
    renderWithMantine(
      <PreviousNextButton onPrevious={vi.fn()} onNext={vi.fn()} nextDisabled />,
    );

    const disabled = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-disabled") === "true");

    expect(disabled.length).toBeGreaterThan(0);
    disabled.forEach((button) => expect(button.style.cursor).toBe("default"));
  });
});

describe("disabled-controls.css reaches the shared form fields", () => {
  it("a disabled checkbox field", () => {
    renderWithMantine(<CheckboxField label="I confirm this declaration" disabled />);

    const input = screen.getByRole("checkbox", { name: "I confirm this declaration" });
    expect(input).toBeDisabled();
    expect(ruleReaches(input)).toBe(true);
  });

  it("a disabled switch, and what is drawn just after it", () => {
    renderWithMantine(<SolidSwitch aria-label="Email me about changes" disabled />);

    const input = screen.getByRole("switch", { name: "Email me about changes" });
    const drawn = input.nextElementSibling;

    expect(input).toBeDisabled();
    expect(drawn !== null && ruleReaches(drawn)).toBe(true);
  });

  it("a disabled text field", () => {
    renderWithMantine(<TextField label="Hazard title" disabled />);

    const input = screen.getByLabelText("Hazard title");
    expect(input).toBeDisabled();
    expect(ruleReaches(input)).toBe(true);
  });
});
