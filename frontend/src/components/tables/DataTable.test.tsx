/**
 * DataTable Component Tests
 *
 * Tests for the DataTable component covering:
 * - Rendering with data
 * - Column rendering with custom render functions
 * - Row click interactions
 * - Loading, error, and empty states
 * - Type safety with different data structures
 */

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { Badge } from "@mantine/core";
import DataTable, { type Column } from "./DataTable";
import classes from "./DataTable.module.css";

interface TestUser {
  id: number;
  name: string;
  email: string;
}

interface TestHazard {
  id: string;
  name: string;
  status: "active" | "inactive";
}

describe("DataTable", () => {
  describe("Rendering with data", () => {
    it("renders table with headers and data rows", () => {
      const users: TestUser[] = [
        { id: 1, name: "Alice", email: "alice@example.com" },
        { id: 2, name: "Bob", email: "bob@example.com" },
      ];

      const columns: Column<TestUser>[] = [
        { header: "Name", render: (user) => user.name },
        { header: "Email", render: (user) => user.email },
      ];

      renderWithMantine(
        <DataTable
          data={users}
          columns={columns}
          onRowClick={vi.fn()}
          getRowKey={(user) => user.id}
        />,
      );

      // Check headers
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();

      // Check data
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });

    it("renders custom components in cells", () => {
      const hazards: TestHazard[] = [
        { id: "h1", name: "Wrong record opened", status: "active" },
        { id: "h2", name: "Allergy not shown", status: "inactive" },
      ];

      const columns: Column<TestHazard>[] = [
        {
          header: "Name",
          render: (hazard) => hazard.name,
        },
        {
          header: "Status",
          render: (hazard) => (
            <Badge
              color={hazard.status === "active" ? "var(--success-color)" : "var(--alert-color)"}
            >
              {hazard.status}
            </Badge>
          ),
        },
      ];

      renderWithMantine(
        <DataTable
          data={hazards}
          columns={columns}
          onRowClick={vi.fn()}
          getRowKey={(hazard) => hazard.id}
        />,
      );

      expect(screen.getByText("Wrong record opened")).toBeInTheDocument();
      expect(screen.getByText("active")).toBeInTheDocument();
      expect(screen.getByText("Allergy not shown")).toBeInTheDocument();
      expect(screen.getByText("inactive")).toBeInTheDocument();
    });
  });

  describe("Row interactions", () => {
    it("calls onRowClick with row data when row is clicked", async () => {
      const user = userEvent.setup();
      const users: TestUser[] = [{ id: 1, name: "Alice", email: "alice@example.com" }];

      const columns: Column<TestUser>[] = [{ header: "Name", render: (u) => u.name }];

      const handleRowClick = vi.fn();

      renderWithMantine(
        <DataTable
          data={users}
          columns={columns}
          onRowClick={handleRowClick}
          getRowKey={(u) => u.id}
        />,
      );

      const row = screen.getByText("Alice").closest("tr");
      await user.click(row!);

      expect(handleRowClick).toHaveBeenCalledWith(users[0]);
      expect(handleRowClick).toHaveBeenCalledTimes(1);
    });

    it("applies pointer cursor to rows", () => {
      const users: TestUser[] = [{ id: 1, name: "Alice", email: "alice@example.com" }];

      const columns: Column<TestUser>[] = [{ header: "Name", render: (u) => u.name }];

      renderWithMantine(
        <DataTable
          data={users}
          columns={columns}
          onRowClick={vi.fn()}
          getRowKey={(u) => u.id}
        />,
      );

      const row = screen.getByText("Alice").closest("tr");
      expect(row).toHaveStyle({ cursor: "pointer" });
    });
  });

  describe("Loading state", () => {
    it("announces loading, then goes quiet once loaded", () => {
      const columns: Column<TestUser>[] = [{ header: "Name", render: (u) => u.name }];
      const { rerender } = renderWithMantine(
        <DataTable data={[]} columns={columns} getRowKey={(u) => u.id} loading />,
      );
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Loading");

      rerender(<DataTable data={[]} columns={columns} getRowKey={(u) => u.id} />);
      // The same region, still mounted, now empty
      expect(screen.getByRole("status")).toBe(status);
      expect(status).toBeEmptyDOMElement();
    });

    it("shows skeleton loaders when loading", () => {
      const columns: Column<TestUser>[] = [{ header: "Name", render: (u) => u.name }];

      const { container } = renderWithMantine(
        <DataTable
          data={[]}
          columns={columns}
          onRowClick={vi.fn()}
          getRowKey={(u) => u.id}
          loading
        />,
      );

      // Loading state shows a table with skeleton rows
      const table = container.querySelector("table");
      expect(table).toBeInTheDocument();

      // Headers are visible but no real data
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    it("does not show data rows when loading", () => {
      const users: TestUser[] = [{ id: 1, name: "Alice", email: "alice@example.com" }];

      const columns: Column<TestUser>[] = [{ header: "Name", render: (u) => u.name }];

      renderWithMantine(
        <DataTable
          data={users}
          columns={columns}
          onRowClick={vi.fn()}
          getRowKey={(u) => u.id}
          loading
        />,
      );

      // Headers shown, but data content is not rendered
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("shows error alert when error is provided", () => {
      const columns: Column<TestUser>[] = [{ header: "Name", render: (u) => u.name }];

      renderWithMantine(
        <DataTable
          data={[]}
          columns={columns}
          onRowClick={vi.fn()}
          getRowKey={(u) => u.id}
          error="Failed to load data"
        />,
      );

      expect(screen.getByText("Error loading data")).toBeInTheDocument();
      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    });

    it("does not show table when error is present", () => {
      const users: TestUser[] = [{ id: 1, name: "Alice", email: "alice@example.com" }];

      const columns: Column<TestUser>[] = [{ header: "Name", render: (u) => u.name }];

      renderWithMantine(
        <DataTable
          data={users}
          columns={columns}
          onRowClick={vi.fn()}
          getRowKey={(u) => u.id}
          error="Error occurred"
        />,
      );

      expect(screen.queryByText("Name")).not.toBeInTheDocument();
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows default empty message when no data", () => {
      const columns: Column<TestUser>[] = [{ header: "Name", render: (u) => u.name }];

      renderWithMantine(
        <DataTable data={[]} columns={columns} onRowClick={vi.fn()} getRowKey={(u) => u.id} />,
      );

      expect(screen.getByText("No data found")).toBeInTheDocument();
    });

    it("shows custom empty message when provided", () => {
      const columns: Column<TestUser>[] = [{ header: "Name", render: (u) => u.name }];

      renderWithMantine(
        <DataTable
          data={[]}
          columns={columns}
          onRowClick={vi.fn()}
          getRowKey={(u) => u.id}
          emptyMessage="No users found"
        />,
      );

      expect(screen.getByText("No users found")).toBeInTheDocument();
    });
  });

  describe("Column configuration", () => {
    it("applies custom column width", () => {
      const users: TestUser[] = [{ id: 1, name: "Alice", email: "alice@example.com" }];

      const columns: Column<TestUser>[] = [
        { header: "Name", render: (u) => u.name, width: "200px" },
        { header: "Email", render: (u) => u.email },
      ];

      renderWithMantine(
        <DataTable
          data={users}
          columns={columns}
          onRowClick={vi.fn()}
          getRowKey={(u) => u.id}
        />,
      );

      const headers = screen.getAllByRole("columnheader");
      expect(headers[0]).toHaveStyle({ width: "200px" });
    });

    it("keeps every header from breaking inside a word, sortable or not", () => {
      const users: TestUser[] = [{ id: 1, name: "Alice", email: "alice@example.com" }];
      const columns: Column<TestUser>[] = [
        {
          header: "Authorised here",
          render: (u) => u.name,
          accessor: (u) => u.name,
          width: "140px",
        },
        { header: "Email", render: (u) => u.email },
      ];

      renderWithMantine(<DataTable data={users} columns={columns} getRowKey={(u) => u.id} />);

      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(2);
      headers.forEach((header) =>
        expect(header).toHaveClass(classes.header ?? "missing-css-module-class"),
      );
    });
  });

  describe("Pagination", () => {
    const manyUsers: TestUser[] = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
    }));

    const columns: Column<TestUser>[] = [
      { header: "Name", render: (u) => u.name },
      { header: "Email", render: (u) => u.email },
    ];

    it("shows pagination when data exceeds pageSize", () => {
      renderWithMantine(
        <DataTable data={manyUsers} columns={columns} getRowKey={(u) => u.id} pageSize={5} />,
      );

      // Should show page 1 data
      expect(screen.getByText("User 1")).toBeInTheDocument();
      expect(screen.getByText("User 5")).toBeInTheDocument();
      // Should NOT show page 2 data
      expect(screen.queryByText("User 6")).not.toBeInTheDocument();
      // Pagination control should be present
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    it("does not show pagination when data fits in one page", () => {
      const fewUsers = manyUsers.slice(0, 3);

      renderWithMantine(
        <DataTable data={fewUsers} columns={columns} getRowKey={(u) => u.id} pageSize={5} />,
      );

      expect(screen.getByText("User 1")).toBeInTheDocument();
      expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
    });

    it("navigates to next page on click", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <DataTable data={manyUsers} columns={columns} getRowKey={(u) => u.id} pageSize={5} />,
      );

      // Click next page
      await user.click(screen.getByRole("button", { name: "Next page" }));

      // Should show page 2 data
      expect(screen.getByText("User 6")).toBeInTheDocument();
      expect(screen.getByText("User 10")).toBeInTheDocument();
      // Should NOT show page 1 data
      expect(screen.queryByText("User 1")).not.toBeInTheDocument();
    });

    it("does not show pagination when pageSize is not set", () => {
      renderWithMantine(
        <DataTable data={manyUsers} columns={columns} getRowKey={(u) => u.id} />,
      );

      // All data should be visible
      expect(screen.getByText("User 1")).toBeInTheDocument();
      expect(screen.getByText("User 12")).toBeInTheDocument();
      // No pagination buttons
      expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    const users: TestUser[] = [
      { id: 1, name: "Charlie", email: "charlie@example.com" },
      { id: 2, name: "Alice", email: "alice@example.com" },
      { id: 3, name: "Bob", email: "bob@example.com" },
    ];

    const sortableColumns: Column<TestUser>[] = [
      {
        header: "Name",
        render: (u) => u.name,
        accessor: (u) => u.name,
      },
      {
        header: "Email",
        render: (u) => u.email,
        accessor: (u) => u.email,
      },
    ];

    it("renders sort buttons on columns with accessor", () => {
      renderWithMantine(
        <DataTable data={users} columns={sortableColumns} getRowKey={(u) => u.id} />,
      );

      expect(screen.getByRole("button", { name: "Sort by Name" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sort by Email" })).toBeInTheDocument();
    });

    it("does not render sort button on columns without accessor", () => {
      const mixedColumns: Column<TestUser>[] = [
        {
          header: "Name",
          render: (u) => u.name,
          accessor: (u) => u.name,
        },
        { header: "Email", render: (u) => u.email },
      ];

      renderWithMantine(
        <DataTable data={users} columns={mixedColumns} getRowKey={(u) => u.id} />,
      );

      expect(screen.getByRole("button", { name: "Sort by Name" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Sort by Email" })).not.toBeInTheDocument();
    });

    it("sorts ascending on first click", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <DataTable data={users} columns={sortableColumns} getRowKey={(u) => u.id} />,
      );

      await user.click(screen.getByRole("button", { name: "Sort by Name" }));

      const cells = screen.getAllByRole("cell");
      // First row should be Alice (sorted asc)
      expect(cells[0]).toHaveTextContent("Alice");
      expect(cells[2]).toHaveTextContent("Bob");
      expect(cells[4]).toHaveTextContent("Charlie");
    });

    it("sorts descending on second click", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <DataTable data={users} columns={sortableColumns} getRowKey={(u) => u.id} />,
      );

      const sortButton = screen.getByRole("button", { name: "Sort by Name" });
      await user.click(sortButton);
      await user.click(sortButton);

      const cells = screen.getAllByRole("cell");
      // First row should be Charlie (sorted desc)
      expect(cells[0]).toHaveTextContent("Charlie");
      expect(cells[2]).toHaveTextContent("Bob");
      expect(cells[4]).toHaveTextContent("Alice");
    });

    it("removes sort on third click (returns to original order)", async () => {
      const user = userEvent.setup();

      renderWithMantine(
        <DataTable data={users} columns={sortableColumns} getRowKey={(u) => u.id} />,
      );

      const sortButton = screen.getByRole("button", { name: "Sort by Name" });
      await user.click(sortButton); // asc
      await user.click(sortButton); // desc
      await user.click(sortButton); // none

      const cells = screen.getAllByRole("cell");
      // Original order: Charlie, Alice, Bob
      expect(cells[0]).toHaveTextContent("Charlie");
      expect(cells[2]).toHaveTextContent("Alice");
      expect(cells[4]).toHaveTextContent("Bob");
    });

    it("sorts numerically when accessor returns numbers", async () => {
      const user = userEvent.setup();

      const numericColumns: Column<TestUser>[] = [
        {
          header: "ID",
          render: (u) => u.id.toString(),
          accessor: (u) => u.id,
        },
        { header: "Name", render: (u) => u.name },
      ];

      const unorderedUsers: TestUser[] = [
        { id: 3, name: "C", email: "c@example.com" },
        { id: 1, name: "A", email: "a@example.com" },
        { id: 2, name: "B", email: "b@example.com" },
      ];

      renderWithMantine(
        <DataTable data={unorderedUsers} columns={numericColumns} getRowKey={(u) => u.id} />,
      );

      await user.click(screen.getByRole("button", { name: "Sort by ID" }));

      const cells = screen.getAllByRole("cell");
      expect(cells[0]).toHaveTextContent("1");
      expect(cells[2]).toHaveTextContent("2");
      expect(cells[4]).toHaveTextContent("3");
    });
  });
});
