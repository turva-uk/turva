/**
 * TablePagination Compound Component Tests
 *
 * Tests for the TablePagination compound component covering:
 * - Nav: Rendering "Page X of Y" with prev/next arrows
 * - Nav: Hidden when total is 1 or less
 * - Nav: Page change callback via arrows
 * - PageSize: Menu with page size options
 */

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import TablePagination from "./TablePagination";

describe("TablePagination", () => {
  describe("Nav", () => {
    it("renders pagination when total > 1", () => {
      renderWithMantine(
        <TablePagination>
          <TablePagination.Nav total={5} value={2} onChange={() => {}} />
        </TablePagination>,
      );
      expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Previous page" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next page" })).toBeInTheDocument();
    });

    it("renders nothing when total is 1", () => {
      renderWithMantine(
        <TablePagination>
          <TablePagination.Nav total={1} value={1} onChange={() => {}} />
        </TablePagination>,
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("renders nothing when total is 0", () => {
      renderWithMantine(
        <TablePagination>
          <TablePagination.Nav total={0} value={1} onChange={() => {}} />
        </TablePagination>,
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("calls onChange when next arrow is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithMantine(
        <TablePagination>
          <TablePagination.Nav total={5} value={2} onChange={onChange} />
        </TablePagination>,
      );
      await user.click(screen.getByRole("button", { name: "Next page" }));
      expect(onChange).toHaveBeenCalledWith(3);
    });

    it("calls onChange when previous arrow is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithMantine(
        <TablePagination>
          <TablePagination.Nav total={5} value={3} onChange={onChange} />
        </TablePagination>,
      );
      await user.click(screen.getByRole("button", { name: "Previous page" }));
      expect(onChange).toHaveBeenCalledWith(2);
    });

    it("disables previous arrow on first page", () => {
      renderWithMantine(
        <TablePagination>
          <TablePagination.Nav total={5} value={1} onChange={() => {}} />
        </TablePagination>,
      );
      expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    });

    it("disables next arrow on last page", () => {
      renderWithMantine(
        <TablePagination>
          <TablePagination.Nav total={5} value={5} onChange={() => {}} />
        </TablePagination>,
      );
      expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    });
  });

  describe("Touch target", () => {
    it("gives both arrows the class that makes them 44px on phones", () => {
      renderWithMantine(
        <TablePagination>
          <TablePagination.Nav total={5} value={2} onChange={() => {}} />
        </TablePagination>,
      );
      for (const name of ["Previous page", "Next page"]) {
        expect(screen.getByRole("button", { name }).className).toMatch(/arrow/);
      }
    });

    it("gives the page-size picker the class that makes it 44px on phones", () => {
      renderWithMantine(
        <TablePagination>
          <TablePagination.PageSize value={10} onChange={() => {}} />
        </TablePagination>,
      );
      expect(screen.getByText("10").closest("button")?.className).toMatch(/pageSizeButton/);
    });
  });

  describe("PageSize", () => {
    it("names the picker and exposes only actual menu items", async () => {
      const user = userEvent.setup();
      renderWithMantine(<TablePagination.PageSize value={10} onChange={vi.fn()} />);
      await user.click(screen.getByRole("button", { name: "Items per page: 10" }));
      expect(
        screen.getByRole("menu").querySelector('[role="presentation"][tabindex]'),
      ).toBeNull();
    });

    it("renders page size button", () => {
      renderWithMantine(
        <TablePagination>
          <TablePagination.PageSize value={10} onChange={() => {}} />
        </TablePagination>,
      );
      expect(screen.getByText("Items per page:")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("calls onChange with selected value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithMantine(
        <TablePagination>
          <TablePagination.PageSize value={10} onChange={onChange} />
        </TablePagination>,
      );
      await user.click(screen.getByText("10"));
      await user.click(screen.getByRole("menuitem", { name: "50" }));
      expect(onChange).toHaveBeenCalledWith(50);
    });

    it("shows current page size value", () => {
      renderWithMantine(
        <TablePagination>
          <TablePagination.PageSize value={20} onChange={() => {}} />
        </TablePagination>,
      );
      expect(screen.getByText("20")).toBeInTheDocument();
    });
  });
});
