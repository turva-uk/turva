import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import OpenableCell from "./OpenableCell";

describe("OpenableCell", () => {
  it("draws text as a button that opens the row", () => {
    const onOpen = vi.fn();
    renderWithMantine(<OpenableCell content="Jane Smith" onOpen={onOpen} />);

    screen.getByRole("button", { name: "Jane Smith" }).click();

    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("opens the row from the keyboard", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderWithMantine(<OpenableCell content="Jane Smith" onOpen={onOpen} />);

    await user.tab();
    await user.keyboard("{Enter}");

    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("leaves text as text without onOpen", () => {
    renderWithMantine(<OpenableCell content="Jane Smith" />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("never wraps a control, since a button cannot hold one", () => {
    renderWithMantine(
      <OpenableCell content={<button type="button">Options</button>} onOpen={() => {}} />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Options" })).toBeInTheDocument();
  });
});
