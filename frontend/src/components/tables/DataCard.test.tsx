/**
 * DataCard Component Tests
 *
 * Tests for the DataCard component covering:
 * - Rendering column headers and content
 * - Click interactions
 * - Dividers between fields
 * - Custom render functions (e.g. badges)
 */

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { Badge } from "@mantine/core";
import DataCard, { DataCardSkeleton } from "./DataCard";
import type { Column } from "./DataTable";

interface TestUser {
  id: number;
  name: string;
  email: string;
}

const sampleUser: TestUser = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
};

const userColumns: Column<TestUser>[] = [
  { header: "Name", render: (u) => u.name },
  { header: "Email", render: (u) => u.email },
];

describe("DataCard", () => {
  describe("Rendering", () => {
    it("renders column headers and content", () => {
      renderWithMantine(<DataCard row={sampleUser} columns={userColumns} onClick={vi.fn()} />);

      expect(screen.getByText("Name:")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Email:")).toBeInTheDocument();
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });

    it("renders custom components from render functions", () => {
      const columns: Column<TestUser>[] = [
        { header: "Name", render: (u) => u.name },
        {
          header: "Status",
          render: () => <Badge color="var(--success-color)">Active</Badge>,
        },
      ];

      renderWithMantine(<DataCard row={sampleUser} columns={columns} onClick={vi.fn()} />);

      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders dividers between fields but not after the last", () => {
      const { container } = renderWithMantine(
        <DataCard row={sampleUser} columns={userColumns} onClick={vi.fn()} />,
      );

      // Two columns → one divider (between first and second)
      const dividers = container.querySelectorAll(".mantine-Divider-root");
      expect(dividers).toHaveLength(1);
    });

    it("renders no dividers for a single field", () => {
      const columns: Column<TestUser>[] = [{ header: "Name", render: (u) => u.name }];

      const { container } = renderWithMantine(
        <DataCard row={sampleUser} columns={columns} onClick={vi.fn()} />,
      );

      const dividers = container.querySelectorAll(".mantine-Divider-root");
      expect(dividers).toHaveLength(0);
    });
  });

  describe("Interactions", () => {
    it("calls onClick with row data when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      renderWithMantine(
        <DataCard row={sampleUser} columns={userColumns} onClick={handleClick} />,
      );

      await user.click(screen.getByText("Alice"));

      expect(handleClick).toHaveBeenCalledWith(sampleUser);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("has pointer cursor styling", () => {
      const { container } = renderWithMantine(
        <DataCard row={sampleUser} columns={userColumns} onClick={vi.fn()} />,
      );

      const card = container.querySelector(".mantine-Card-root");
      expect(card).toHaveStyle({ cursor: "pointer" });
    });
  });

  describe("DataCardSkeleton", () => {
    it("stands in for a card with skeletons, and no row", () => {
      const { container } = renderWithMantine(<DataCardSkeleton />);

      expect(container.querySelectorAll(".mantine-Skeleton-root").length).toBe(3);
    });
  });

  describe("Loading state", () => {
    it("shows skeleton placeholders when loading", () => {
      const { container } = renderWithMantine(
        <DataCard row={sampleUser} columns={userColumns} onClick={vi.fn()} loading />,
      );

      expect(screen.queryByText("Name:")).not.toBeInTheDocument();
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
      expect(container.querySelectorAll(".mantine-Skeleton-root").length).toBeGreaterThan(0);
    });
  });

  it("shows a footer beneath the fields", () => {
    renderWithMantine(
      <DataCard
        row={{ name: "Module B" }}
        columns={[{ header: "Name", render: (r: { name: string }) => r.name }]}
        onClick={() => {}}
        footer="Version mismatch"
      />,
    );

    expect(screen.getByText("Version mismatch")).toBeInTheDocument();
  });

  describe("A last column with an empty header", () => {
    type Row = { name: string };
    const withAction: Column<Row>[] = [
      { header: "Name", render: (r) => r.name },
      {
        header: "",
        render: () => <button type="button">More actions</button>,
      },
    ];

    it("is drawn as the card's action, with no label", () => {
      renderWithMantine(
        <DataCard row={{ name: "EoEETA" }} columns={withAction} onClick={() => {}} />,
      );

      expect(screen.getByTestId("data-card-action")).toContainElement(
        screen.getByRole("button", { name: "More actions" }),
      );
      // The bare ":" it once showed on a line of its own.
      expect(screen.queryByText(":")).not.toBeInTheDocument();
      expect(screen.getByText("Name:")).toBeInTheDocument();
    });

    it("is left as a field when it is not the last column", () => {
      const notLast: Column<Row>[] = [
        { header: "", render: () => "Untitled" },
        { header: "Name", render: (r) => r.name },
      ];

      renderWithMantine(
        <DataCard row={{ name: "EoEETA" }} columns={notLast} onClick={() => {}} />,
      );

      expect(screen.queryByTestId("data-card-action")).not.toBeInTheDocument();
      expect(screen.getByText("Untitled")).toBeInTheDocument();
    });

    it("leaves a card with every header named as it was", () => {
      renderWithMantine(
        <DataCard
          row={{ name: "EoEETA" }}
          columns={[{ header: "Name", render: (r: Row) => r.name }]}
          onClick={() => {}}
        />,
      );

      expect(screen.queryByTestId("data-card-action")).not.toBeInTheDocument();
    });
  });
});
