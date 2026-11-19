import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import SelectField from "./SelectField";
import MultiSelectField from "./MultiSelectField";
import { dropdownScrollArea } from "./dropdownScrollArea";

describe("scrollable dropdown keyboard access", () => {
  it.each([SelectField, MultiSelectField])(
    "provides a visible keyboard focus target inside an open dropdown",
    async (Field) => {
      const user = userEvent.setup();
      renderWithMantine(<Field label="Hazard owner" data={["Alex Morgan", "Sam Taylor"]} />);
      await user.click(screen.getByRole("combobox", { name: "Hazard owner" }));
      const viewport = document.querySelector("[data-scrollarea-viewport]");
      expect(viewport).toHaveAttribute("tabindex", "0");
      expect(viewport).toHaveClass("mantine-focus-auto");
      expect(viewport).toHaveAttribute("role", "group");
      expect(viewport).toHaveAccessibleName("Available options");
    },
  );
  it("preserves caller viewport props and explicit focus policy", () => {
    const props = dropdownScrollArea({
      viewportProps: { tabIndex: -1, className: "custom", "aria-label": "Options" },
    });
    expect(props.viewportProps).toEqual({
      tabIndex: -1,
      role: "group",
      className: "custom",
      "aria-label": "Options",
    });
  });
});

describe("read-only dropdowns", () => {
  it.each([
    { Field: SelectField, searchable: false },
    { Field: SelectField, searchable: true },
    { Field: MultiSelectField, searchable: false },
    { Field: MultiSelectField, searchable: true },
  ])(
    "closes an open dropdown on revocation and keeps its values readable without edits",
    async ({ Field, searchable }) => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const props = {
        label: "Hazard owner",
        data: ["Alex Morgan", "Sam Taylor"],
        onChange,
        clearable: true,
        searchable,
      };
      const { rerender, container } = renderWithMantine(<Field {...props} />);
      const input = screen.getByRole("combobox", { name: "Hazard owner" });
      await user.click(input);
      await user.click(screen.getByRole("option", { name: "Alex Morgan" }));
      onChange.mockClear();
      await user.keyboard("{Escape}{ArrowDown}");
      expect(input).toHaveAttribute("aria-expanded", "true");
      rerender(<Field {...props} readOnly />);
      expect(input).toHaveAttribute("aria-expanded", "false");
      expect(input).toHaveAttribute("aria-readonly", "true");
      expect(input).not.toBeDisabled();
      await user.click(input);
      await user.keyboard("{ArrowDown}{Enter}{Backspace}");
      expect(input).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("option")).not.toBeInTheDocument();
      if (Field === SelectField) expect(input).toHaveValue("Alex Morgan");
      else {
        const selected = within(container)
          .getAllByText("Alex Morgan")
          .find((label) => !label.closest('[role="listbox"]'));
        expect(selected).toBeVisible();
      }
      expect(onChange).not.toHaveBeenCalled();
    },
  );
});
