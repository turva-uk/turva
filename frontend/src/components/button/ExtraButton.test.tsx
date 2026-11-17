/**
 * ExtraButton Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import ExtraButton from "./ExtraButton";
import { IconUserPlus } from "@/components/icons/appIcons";

describe("ExtraButton", () => {
  it("is a button named by its label, with an icon and no text", () => {
    const { container } = renderWithMantine(<ExtraButton aria-label="Add hazard" />);
    const button = screen.getByRole("button", { name: "Add hazard" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("reports a click", async () => {
    const onClick = vi.fn();
    renderWithMantine(<ExtraButton aria-label="Add hazard" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Add hazard" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("can be disabled", () => {
    renderWithMantine(<ExtraButton aria-label="Add hazard" disabled />);
    expect(screen.getByRole("button", { name: "Add hazard" })).toBeDisabled();
  });

  it("shows its label as a tooltip on hover", async () => {
    renderWithMantine(<ExtraButton aria-label="Add hazard" />);
    await userEvent.hover(screen.getByRole("button", { name: "Add hazard" }));
    // The aria-label is not text, so the only "Add hazard" text on the
    // page is the tooltip.
    expect(await screen.findByText("Add hazard")).toBeInTheDocument();
  });

  it("takes another icon for another kind of record", () => {
    const { container } = renderWithMantine(
      <ExtraButton aria-label="Add user" icon={<IconUserPlus />} />,
    );
    expect(screen.getByRole("button", { name: "Add user" })).toBeInTheDocument();
    expect(container.querySelector("svg.tabler-icon-user-plus")).toBeInTheDocument();
  });

  it("draws its icon at the search and filter icons' size, with a stroke that matches their weight", () => {
    const { container } = renderWithMantine(<ExtraButton aria-label="Add hazard" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveAttribute("stroke-width", "2");
  });
});
