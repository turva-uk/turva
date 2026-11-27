import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithMantine } from "@/test/test-utils";
import InboxButton from "./InboxButton";

describe("InboxButton", () => {
  it("opens the inbox when pressed", async () => {
    const onClick = vi.fn();
    renderWithMantine(<InboxButton label="Inbox" onClick={onClick} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Inbox" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows no number while nothing is waiting", () => {
    renderWithMantine(<InboxButton label="Inbox" onClick={() => undefined} />);

    expect(screen.queryByTestId("inbox-count")).not.toBeInTheDocument();
  });

  it("shows how many are waiting, and says so to a screen reader", () => {
    renderWithMantine(<InboxButton label="Inbox" count={3} onClick={() => undefined} />);

    expect(screen.getByTestId("inbox-count")).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: "Inbox (3 waiting)" })).toBeInTheDocument();
  });

  it("shows ten or more as 9+", () => {
    renderWithMantine(<InboxButton label="Inbox" count={12} onClick={() => undefined} />);

    expect(screen.getByTestId("inbox-count")).toHaveTextContent("9+");
  });
});
