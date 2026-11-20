import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import FilterSelect from "./FilterSelect";

const media = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: () => media.isMobile };
});

beforeEach(() => {
  media.isMobile = false;
});

const options = [
  {
    group: "Trust",
    items: [
      { value: "trust:leeds", label: "Leeds Teaching Hospitals" },
      { value: "trust:bradford", label: "Bradford Teaching Hospitals" },
    ],
  },
];

describe("FilterSelect", () => {
  describe("Touch target", () => {
    it("is 34px (Mantine lg) on desktop", () => {
      renderWithMantine(<FilterSelect data={options} value={[]} onChange={() => {}} />);
      const button = screen.getByRole("button", { name: "Filter" });
      expect(button.style.getPropertyValue("--ai-size")).toBe("var(--ai-size-lg)");
    });

    it("is 44px below the sm breakpoint", () => {
      media.isMobile = true;
      renderWithMantine(<FilterSelect data={options} value={[]} onChange={() => {}} />);
      const button = screen.getByRole("button", { name: "Filter" });
      expect(button.style.getPropertyValue("--ai-size")).toContain("2.75rem");
    });
  });
  it("renders a filter button", () => {
    renderWithMantine(
      <FilterSelect data={options} value={[]} onChange={() => {}} aria-label="Filter" />,
    );
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
  });

  it("does not show indicator when no filters active", () => {
    const { container } = renderWithMantine(
      <FilterSelect data={options} value={[]} onChange={() => {}} aria-label="Filter" />,
    );
    expect(container.querySelector("[data-indicator]")).not.toBeInTheDocument();
  });

  it("shows indicator count when filters are active", () => {
    renderWithMantine(
      <FilterSelect
        data={options}
        value={["trust:leeds"]}
        onChange={() => {}}
        aria-label="Filter"
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("opens popover with multiselect on click", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <FilterSelect
        data={options}
        value={[]}
        onChange={() => {}}
        label="Filter delegates"
        aria-label="Filter"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByText("Filter delegates")).toBeInTheDocument();
  });

  it("displays custom label inside popover", async () => {
    const user = userEvent.setup();
    renderWithMantine(
      <FilterSelect
        data={options}
        value={[]}
        onChange={() => {}}
        label="Narrow results"
        aria-label="Filter"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByText("Narrow results")).toBeInTheDocument();
  });

  it("puts the popover state on the button itself", async () => {
    // Popover.Target writes aria-expanded onto its child. On the button
    // it tells a screen reader whether the filter is open; on a wrapping
    // div it is not allowed and says nothing.
    const user = userEvent.setup();
    renderWithMantine(
      <FilterSelect
        data={options}
        value={["trust:leeds"]}
        onChange={() => {}}
        aria-label="Filter"
      />,
    );

    const button = screen.getByRole("button", { name: "Filter" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button.parentElement).not.toHaveAttribute("aria-expanded");
  });

  it("shows its label as a tooltip on hover", async () => {
    renderWithMantine(
      <FilterSelect data={["One"]} value={[]} onChange={vi.fn()} aria-label="Filter users" />,
    );
    await userEvent.hover(screen.getByRole("button", { name: "Filter users" }));
    expect(await screen.findByText("Filter users")).toBeInTheDocument();
  });
});
