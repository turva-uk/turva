import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import FilterModal from "./FilterModal";

const groupedData = [
  {
    group: "Trust",
    items: [
      { value: "trust:leeds", label: "Leeds Teaching Hospitals" },
      { value: "trust:bradford", label: "Bradford Teaching Hospitals" },
    ],
  },
];

describe("FilterModal", () => {
  it("renders the multi-select field with label", () => {
    renderWithMantine(
      <FilterModal
        data={groupedData}
        value={[]}
        onChange={() => {}}
        label="Filter delegates"
      />,
    );
    expect(screen.getByText("Filter delegates")).toBeInTheDocument();
  });

  it("renders the multi-select input", () => {
    renderWithMantine(
      <FilterModal
        data={groupedData}
        value={[]}
        onChange={() => {}}
        placeholder="Select items\u2026"
      />,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows reset link when filters are active", () => {
    renderWithMantine(
      <FilterModal data={groupedData} value={["trust:leeds"]} onChange={() => {}} />,
    );
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("does not show reset link when no filters active", () => {
    renderWithMantine(<FilterModal data={groupedData} value={[]} onChange={() => {}} />);
    expect(screen.queryByText("Reset")).not.toBeInTheDocument();
  });

  it("calls onChange with empty array on reset click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithMantine(
      <FilterModal data={groupedData} value={["trust:leeds"]} onChange={onChange} />,
    );
    await user.click(screen.getByText("Reset"));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
