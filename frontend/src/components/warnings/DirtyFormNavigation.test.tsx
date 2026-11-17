/**
 * DirtyFormNavigation Component Tests
 *
 * Tests the navigation blocker modal that warns users about unsaved changes.
 */
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import type { Blocker, Location } from "react-router";
import DirtyFormNavigation from "./DirtyFormNavigation";

const mockLocation: Location = {
  pathname: "/test",
  search: "",
  hash: "",
  state: null,
  key: "default",
};

describe("DirtyFormNavigation", () => {
  it("renders modal when blocker state is blocked", () => {
    const blocker: Blocker = {
      state: "blocked",
      reset: vi.fn(),
      proceed: vi.fn(),
      location: mockLocation,
    };

    renderWithMantine(<DirtyFormNavigation blocker={blocker} />);

    expect(
      screen.getByText("You have unsaved changes. Are you sure you want to leave this page?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^stay$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leave page/i })).toBeInTheDocument();
  });

  it("shows a caller's own message and leave label", () => {
    // A page blocking on something other than a form says so: "unsaved
    // changes" sends the admin hunting for a save button that is not
    // there.
    const blocker: Blocker = {
      state: "blocked",
      reset: vi.fn(),
      proceed: vi.fn(),
      location: mockLocation,
    };

    renderWithMantine(
      <DirtyFormNavigation
        blocker={blocker}
        message="A video is still uploading. If you leave this page you will not see whether it finishes."
        acceptLabel="Leave anyway"
      />,
    );

    expect(
      screen.getByText(
        "A video is still uploading. If you leave this page you will not see whether it finishes.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leave anyway/i })).toBeInTheDocument();
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
  });

  it("does not render modal when blocker state is unblocked", () => {
    const blocker: Blocker = {
      state: "unblocked",
      reset: undefined,
      proceed: undefined,
      location: undefined,
    };

    renderWithMantine(<DirtyFormNavigation blocker={blocker} />);

    expect(
      screen.queryByText("You have unsaved changes. Are you sure you want to leave this page?"),
    ).not.toBeInTheDocument();
  });

  it("calls blocker.reset when Stay on Page is clicked", async () => {
    const user = userEvent.setup();
    const blocker: Blocker = {
      state: "blocked",
      reset: vi.fn(),
      proceed: vi.fn(),
      location: mockLocation,
    };

    renderWithMantine(<DirtyFormNavigation blocker={blocker} />);

    await user.click(screen.getByRole("button", { name: /^stay$/i }));

    expect(blocker.reset).toHaveBeenCalledTimes(1);
    expect(blocker.proceed).not.toHaveBeenCalled();
  });

  it("calls blocker.proceed when Leave Page is clicked", async () => {
    const user = userEvent.setup();
    const blocker: Blocker = {
      state: "blocked",
      reset: vi.fn(),
      proceed: vi.fn(),
      location: mockLocation,
    };

    renderWithMantine(<DirtyFormNavigation blocker={blocker} />);

    await user.click(screen.getByRole("button", { name: /leave page/i }));

    expect(blocker.proceed).toHaveBeenCalledTimes(1);
    expect(blocker.reset).not.toHaveBeenCalled();
  });

  it("calls onProceed callback before proceeding", async () => {
    const user = userEvent.setup();
    const onProceed = vi.fn();
    const blocker: Blocker = {
      state: "blocked",
      reset: vi.fn(),
      proceed: vi.fn(),
      location: mockLocation,
    };

    renderWithMantine(<DirtyFormNavigation blocker={blocker} onProceed={onProceed} />);

    await user.click(screen.getByRole("button", { name: /leave page/i }));

    expect(onProceed).toHaveBeenCalledTimes(1);
    expect(blocker.proceed).toHaveBeenCalledTimes(1);
  });

  it("handles blocker without reset or proceed functions", () => {
    const blocker: Blocker = {
      state: "blocked",
      reset: vi.fn(),
      proceed: vi.fn(),
      location: mockLocation,
    };

    renderWithMantine(<DirtyFormNavigation blocker={blocker} />);

    expect(
      screen.getByText("You have unsaved changes. Are you sure you want to leave this page?"),
    ).toBeInTheDocument();
  });

  it("handles onProceed callback being undefined", async () => {
    const user = userEvent.setup();
    const blocker: Blocker = {
      state: "blocked",
      reset: vi.fn(),
      proceed: vi.fn(),
      location: mockLocation,
    };

    renderWithMantine(<DirtyFormNavigation blocker={blocker} />);

    await user.click(screen.getByRole("button", { name: /leave page/i }));

    // Should not throw error and still proceed
    expect(blocker.proceed).toHaveBeenCalledTimes(1);
  });
});
