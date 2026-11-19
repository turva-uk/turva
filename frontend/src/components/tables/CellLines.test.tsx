/**
 * CellLines Tests
 */

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import CellContent from "./CellContent";
import CellLines from "./CellLines";
import { isTextContent } from "./cellText";

describe("CellLines", () => {
  it("puts each value on a line of its own", () => {
    const { container } = renderWithMantine(
      <CellLines lines={["Northfield", "Riverside", "Day unit"]} />,
    );

    expect(container.querySelectorAll("br")).toHaveLength(2);
    expect(container).toHaveTextContent("NorthfieldRiversideDay unit");
  });

  it("draws one value with no line break", () => {
    const { container } = renderWithMantine(<CellLines lines={["Ward 1"]} />);

    expect(container.querySelector("br")).toBeNull();
    expect(container).toHaveTextContent("Ward 1");
  });

  it("keeps two lines that say the same", () => {
    const { container } = renderWithMantine(<CellLines lines={["-", "-"]} />);

    expect(container.querySelectorAll("br")).toHaveLength(1);
    expect(container).toHaveTextContent("--");
  });

  it("shows a dash when there are none", () => {
    renderWithMantine(<CellLines lines={[]} />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows what it is given when there are none", () => {
    renderWithMantine(<CellLines lines={[]} empty="No site" />);

    expect(screen.getByText("No site")).toBeInTheDocument();
  });

  it("is text to a table cell, so it gets the body text style", () => {
    expect(isTextContent(<CellLines lines={["Ward 1"]} />)).toBe(true);

    const { container } = renderWithMantine(
      <CellContent>
        <CellLines lines={["Ward 1", "Ward 2"]} />
      </CellContent>,
    );

    expect(container.querySelector("br")?.parentElement?.tagName).toBe("SPAN");
  });
});
