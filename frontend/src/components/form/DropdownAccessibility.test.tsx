import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
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
