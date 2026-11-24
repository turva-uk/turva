import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithMantine } from "@/test/test-utils";
import SecondaryButton from "./SecondaryButton";

describe("SecondaryButton", () => {
  it("is an outline button at the filled buttons' size", () => {
    renderWithMantine(<SecondaryButton onClick={() => undefined}>Check again</SecondaryButton>);

    const button = screen.getByRole("button", { name: "Check again" });

    expect(button).toHaveAttribute("data-variant", "outline");
    expect(button).toHaveAttribute("data-size", "md");
    expect(button).toHaveAttribute("type", "button");
  });

  it("takes a fuller name for a screen reader, and still shows its words", () => {
    renderWithMantine(
      <SecondaryButton
        onClick={() => undefined}
        aria-label="Revoke invitation to a.patel@example.org"
      >
        Revoke
      </SecondaryButton>,
    );

    const button = screen.getByRole("button", {
      name: "Revoke invitation to a.patel@example.org",
    });

    expect(button).toHaveTextContent(/^Revoke$/);
  });

  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    renderWithMantine(<SecondaryButton onClick={onClick}>Check again</SecondaryButton>);

    await userEvent.setup().click(screen.getByRole("button", { name: "Check again" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("says it is unavailable while disabled, and ignores presses", async () => {
    const onClick = vi.fn();
    renderWithMantine(
      <SecondaryButton onClick={onClick} disabled>
        Cancel
      </SecondaryButton>,
    );

    const button = screen.getByRole("button", { name: "Cancel" });
    await userEvent.setup().click(button);

    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("ignores presses while what it started is under way", async () => {
    const onClick = vi.fn();
    renderWithMantine(
      <SecondaryButton onClick={onClick} loading>
        Download
      </SecondaryButton>,
    );

    const button = screen.getByRole("button", { name: "Download" });
    await userEvent.setup().click(button);

    expect(button).toHaveAttribute("data-loading");
    expect(onClick).not.toHaveBeenCalled();
  });
});
