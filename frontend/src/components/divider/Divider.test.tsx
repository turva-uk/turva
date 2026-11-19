import { describe, it, expect } from "vitest";
import { renderWithMantine } from "@/test/test-utils";
import Divider from "./Divider";

describe("Divider", () => {
  it("renders a horizontal divider by default", () => {
    const { container } = renderWithMantine(<Divider />);
    const divider = container.querySelector('[role="separator"]');
    expect(divider).toBeInTheDocument();
  });

  it("renders with vertical orientation", () => {
    const { container } = renderWithMantine(<Divider orientation="vertical" />);
    const divider = container.querySelector('[role="separator"]');
    expect(divider).toBeInTheDocument();
    expect(divider).toHaveAttribute("data-orientation", "vertical");
  });
});
