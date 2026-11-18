import { beforeEach, describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import AppTooltip from "./AppTooltip";

const media = vi.hoisted(() => ({ isMobile: false }));
vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: () => media.isMobile };
});
beforeEach(() => {
  media.isMobile = false;
});

describe("AppTooltip", () => {
  it.each([false, true])(
    "opens for keyboard focus and dismisses with Escape (mobile=%s)",
    async (isMobile) => {
      media.isMobile = isMobile;
      renderWithMantine(
        <AppTooltip label="Review guidance" openDelay={0}>
          <button type="button">Review target</button>
        </AppTooltip>,
      );
      const user = userEvent.setup();
      await user.tab();
      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toBeVisible();
      expect(screen.getByRole("button", { name: "Review target" })).toHaveAttribute(
        "aria-describedby",
        tooltip.id,
      );
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
    },
  );

  it("keeps the child's click handler while stopping a mobile tap reaching its parent", async () => {
    media.isMobile = true;
    const onParent = vi.fn();
    const onChild = vi.fn();
    renderWithMantine(
      <div onClick={onParent}>
        <AppTooltip label="Review guidance" openDelay={0}>
          <button type="button" onClick={onChild}>
            Review target
          </button>
        </AppTooltip>
      </div>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Review target" }));
    expect(onChild).toHaveBeenCalledOnce();
    expect(onParent).not.toHaveBeenCalled();
  });

  it("renders children", () => {
    renderWithMantine(
      <AppTooltip label="Hello">
        <button>Target</button>
      </AppTooltip>,
    );
    expect(screen.getByRole("button", { name: "Target" })).toBeInTheDocument();
  });

  it("shows tooltip on hover", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <AppTooltip label="Dr Smith" openDelay={0}>
        <button>Hover me</button>
      </AppTooltip>,
    );

    await user.hover(screen.getByRole("button", { name: "Hover me" }));
    expect(await screen.findByText("Dr Smith")).toBeInTheDocument();
  });

  it("hides tooltip when not hovering", () => {
    renderWithMantine(
      <AppTooltip label="Hidden text">
        <button>Target</button>
      </AppTooltip>,
    );
    expect(screen.queryByText("Hidden text")).not.toBeInTheDocument();
  });

  it("still opens when asked to sit below the target", async () => {
    // jsdom does no layout, so where it lands cannot be checked here;
    // the Below story shows it. This pins that the prop is accepted.
    const user = userEvent.setup();
    renderWithMantine(
      <AppTooltip label="Below" openDelay={0} position="bottom">
        <button type="button">Bottom</button>
      </AppTooltip>,
    );
    await user.hover(screen.getByRole("button", { name: "Bottom" }));
    expect(await screen.findByText("Below")).toBeInTheDocument();
  });
});
