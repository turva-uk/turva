/**
 * CardActionRow Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import CardActionRow from "./CardActionRow";
import IconButton from "@/components/button/IconButton";
import { IconPencil } from "@/components/icons/appIcons";
import { BodyText } from "@/components/typography";

describe("CardActionRow", () => {
  it("renders the text and the action", async () => {
    const onClick = vi.fn();
    renderWithMantine(
      <CardActionRow
        action={<IconButton icon={<IconPencil />} aria-label="Edit" onClick={onClick} />}
      >
        <BodyText>Dr Hannah Okafor</BodyText>
      </CardActionRow>,
    );
    expect(screen.getByText("Dr Hannah Okafor")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders only the text when there is no action", () => {
    renderWithMantine(
      <CardActionRow>
        <BodyText>Dr Hannah Okafor</BodyText>
      </CardActionRow>,
    );
    expect(screen.getByText("Dr Hannah Okafor")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lets the text shrink and keeps the action at full size", () => {
    // Layout is not measured in jsdom, so this pins the classes that
    // carry the two rules; the Narrow story shows the result.
    renderWithMantine(
      <CardActionRow action={<span>action</span>}>
        <BodyText>text</BodyText>
      </CardActionRow>,
    );
    const row = screen.getByTestId("card-action-row");
    expect(row.firstElementChild?.className).toMatch(/text/);
    expect(row.lastElementChild?.className).toMatch(/action/);
  });
});
