/**
 * CellContent Tests
 */

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import FormattedDate from "@/components/data/Date";
import CellContent from "./CellContent";
import { isTextContent } from "./cellText";

describe("CellContent", () => {
  it("treats strings, numbers, fragments and dates as text", () => {
    expect(isTextContent("Active")).toBe(true);
    expect(isTextContent(42)).toBe(true);
    expect(isTextContent(<>Signed on 1 Mar</>)).toBe(true);
    expect(isTextContent(<FormattedDate date="2026-03-01" />)).toBe(true);
    expect(isTextContent(<time dateTime="2026-11-24T10:00:00Z">24 Nov 2026</time>)).toBe(true);
  });

  it("does not treat a control as text", () => {
    expect(isTextContent(<button type="button">More</button>)).toBe(false);
    expect(isTextContent(null)).toBe(false);
  });

  it("gives text the body text line", () => {
    renderWithMantine(<CellContent>Active</CellContent>);
    expect(screen.getByText("Active").tagName).toBe("SPAN");
  });

  it("gives a time element the body text line, so a date is the size of the words beside it", () => {
    renderWithMantine(
      <CellContent>
        <time dateTime="2026-11-24T10:00:00Z">24 Nov 2026</time>
      </CellContent>,
    );

    expect(screen.getByText("24 Nov 2026").parentElement?.tagName).toBe("SPAN");
  });

  it("renders a control as it is, outside any text line", () => {
    renderWithMantine(
      <CellContent>
        <button type="button">More</button>
      </CellContent>,
    );

    // Not inside the body text line, which is what lifted it.
    const button = screen.getByRole("button", { name: "More" });
    expect(button.parentElement?.tagName).not.toBe("SPAN");
  });
});
