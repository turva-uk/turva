/**
 * touch-targets.css sizes controls through Mantine's static class names,
 * such as `.mantine-CloseButton-root`. jsdom cannot apply its media query
 * or measure a size, so these tests guard the other half: that the
 * controls the rule is meant to reach still carry the class it selects.
 * If Mantine renamed a class, the rule would silently match nothing and
 * these would fail.
 */

import { Button, Modal, PasswordInput, TextInput } from "@mantine/core";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithMantine } from "@/test/test-utils";

describe("touch-targets.css selectors", () => {
  it("reaches the modal close button", () => {
    renderWithMantine(
      <Modal opened onClose={vi.fn()} title="Example">
        Body
      </Modal>,
    );

    const close = screen.getByRole("button", { name: "Close dialog" });
    expect(close).toHaveClass("mantine-CloseButton-root");
  });

  it("reaches the wrapper of a text input", () => {
    renderWithMantine(<TextInput label="Name" />);

    const wrapper = screen.getByLabelText("Name").parentElement;
    expect(wrapper).toHaveClass("mantine-Input-wrapper");
  });

  it("reaches the password visibility toggle", () => {
    const { container } = renderWithMantine(<PasswordInput label="Password" />);

    expect(
      container.querySelector(".mantine-PasswordInput-visibilityToggle"),
    ).toBeInTheDocument();
  });

  it("reaches a compact xs button", () => {
    renderWithMantine(<Button size="xs">Deactivate</Button>);

    expect(screen.getByRole("button", { name: "Deactivate" })).toHaveClass(
      "mantine-Button-root",
    );
  });
});
