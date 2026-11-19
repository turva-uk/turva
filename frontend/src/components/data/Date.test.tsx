/**
 * FormattedDate Component Tests
 */

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import FormattedDate from "./Date";

describe("FormattedDate Component", () => {
  describe("British English (en-GB) - default", () => {
    it("renders short format with leading zeros", () => {
      renderWithMantine(<FormattedDate date="1980-09-15" />);
      expect(screen.getByText("15/09/1980")).toBeInTheDocument();
    });

    it("renders medium format with abbreviated month", () => {
      renderWithMantine(<FormattedDate date="1980-09-15" format="medium" />);
      expect(screen.getByText("15 Sept 1980")).toBeInTheDocument();
    });

    it("renders long format with full month name", () => {
      renderWithMantine(<FormattedDate date="1980-09-15" format="long" />);
      expect(screen.getByText("15 September 1980")).toBeInTheDocument();
    });

    it("renders full format with weekday", () => {
      renderWithMantine(<FormattedDate date="1980-09-15" format="full" />);
      expect(screen.getByText("Monday, 15 September 1980")).toBeInTheDocument();
    });

    it("handles single-digit day with leading zero", () => {
      renderWithMantine(<FormattedDate date="2026-12-01" />);
      expect(screen.getByText("01/12/2026")).toBeInTheDocument();
    });

    it("handles single-digit month with leading zero", () => {
      renderWithMantine(<FormattedDate date="2026-05-15" />);
      expect(screen.getByText("15/05/2026")).toBeInTheDocument();
    });
  });

  describe("American English (en-US)", () => {
    it("renders short format with month first", () => {
      renderWithMantine(<FormattedDate date="1980-09-15" locale="en-US" />);
      expect(screen.getByText("09/15/1980")).toBeInTheDocument();
    });

    it("renders medium format", () => {
      renderWithMantine(<FormattedDate date="1980-09-15" locale="en-US" format="medium" />);
      expect(screen.getByText("Sep 15, 1980")).toBeInTheDocument();
    });

    it("renders long format", () => {
      renderWithMantine(<FormattedDate date="1980-09-15" locale="en-US" format="long" />);
      expect(screen.getByText("September 15, 1980")).toBeInTheDocument();
    });

    it("renders full format with weekday", () => {
      renderWithMantine(<FormattedDate date="1980-09-15" locale="en-US" format="full" />);
      expect(screen.getByText("Monday, September 15, 1980")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it.each([
      "2026-02-29",
      "2026-02-30",
      "2026-04-31",
      "1900-02-29",
      "0000-01-01",
      "2026-1-2",
      "05/06/2026",
      "May 5, 2026",
      "2026-05-06T15:00:00Z",
    ])("refuses a non-canonical or impossible calendar date: %s", (date) => {
      renderWithMantine(<FormattedDate date={date} />);
      expect(screen.getByText("Invalid date")).toBeInTheDocument();
    });

    it("returns null for empty string", () => {
      renderWithMantine(<FormattedDate date="" />);
      // Component returns null, so no text should be rendered
      expect(screen.queryByText(/.+/)).not.toBeInTheDocument();
    });

    it("renders 'Invalid date' for malformed date", () => {
      renderWithMantine(<FormattedDate date="not-a-date" />);
      expect(screen.getByText("Invalid date")).toBeInTheDocument();
    });

    it("renders 'Invalid date' for invalid ISO date", () => {
      renderWithMantine(<FormattedDate date="2026-13-45" />);
      expect(screen.getByText("Invalid date")).toBeInTheDocument();
    });

    it("handles leap year date", () => {
      renderWithMantine(<FormattedDate date="2024-02-29" />);
      expect(screen.getByText("29/02/2024")).toBeInTheDocument();
    });

    it("handles year 2000 date", () => {
      renderWithMantine(<FormattedDate date="2000-01-01" />);
      expect(screen.getByText("01/01/2000")).toBeInTheDocument();
    });
  });
});
