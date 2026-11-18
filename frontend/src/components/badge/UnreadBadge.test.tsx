/**
 * UnreadBadge Component Tests
 *
 * Tests for the UnreadBadge component covering:
 * - Rendering with positive counts
 * - Hiding when count is zero or negative
 * - Different size variants
 */

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import UnreadBadge from "./UnreadBadge";

describe("UnreadBadge", () => {
  describe("Visibility", () => {
    it("renders badge when count is positive", () => {
      renderWithMantine(<UnreadBadge count={3} />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders nothing when count is zero", () => {
      renderWithMantine(<UnreadBadge count={0} />);
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });

    it("renders nothing when count is negative", () => {
      renderWithMantine(<UnreadBadge count={-1} />);
      expect(screen.queryByText("-1")).not.toBeInTheDocument();
    });
  });

  describe("Count display", () => {
    it("displays single-digit count", () => {
      renderWithMantine(<UnreadBadge count={5} />);
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("displays 9 as 9", () => {
      renderWithMantine(<UnreadBadge count={9} />);
      expect(screen.getByText("9")).toBeInTheDocument();
    });

    it("caps at 9+ for counts above 9", () => {
      renderWithMantine(<UnreadBadge count={10} />);
      expect(screen.getByText("9+")).toBeInTheDocument();
    });

    it("caps large counts at 9+", () => {
      renderWithMantine(<UnreadBadge count={99} />);
      expect(screen.getByText("9+")).toBeInTheDocument();
    });
  });

  describe("Size variants", () => {
    it("renders with default size", () => {
      renderWithMantine(<UnreadBadge count={1} />);
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("shows skeleton when loading", () => {
      const { container } = renderWithMantine(<UnreadBadge count={3} isLoading />);
      expect(screen.queryByText("3")).not.toBeInTheDocument();
      expect(container.querySelector(".mantine-Skeleton-root")).toBeInTheDocument();
    });
  });
});
