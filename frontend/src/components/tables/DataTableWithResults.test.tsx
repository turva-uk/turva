/**
 * DataTableWithResults Component Tests
 */
import { screen } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { renderWithMantine } from "@/test/test-utils";
import DataTableWithResults, { type ResultColumn } from "./DataTableWithResults";

const media = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: () => media.isMobile };
});

beforeEach(() => {
  media.isMobile = false;
});

interface TestRow {
  id: string;
  name: string;
  reason: string;
}

const columns: ResultColumn<TestRow>[] = [
  { header: "Name", width: "60%", render: (r) => r.name },
  {
    header: "Status",
    width: "40%",
    render: (r) => (r.reason ? "Fail" : "Pass"),
  },
];

const rows: TestRow[] = [
  { id: "a", name: "Module A", reason: "" },
  { id: "b", name: "Module B", reason: "Version mismatch" },
  { id: "c", name: "Module C", reason: "" },
];
const mismatched: TestRow = { id: "b", name: "Module B", reason: "Version mismatch" };

describe("DataTableWithResults", () => {
  it("renders column headers", () => {
    renderWithMantine(
      <DataTableWithResults data={rows} columns={columns} getRowKey={(r) => r.id} />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders all data rows", () => {
    renderWithMantine(
      <DataTableWithResults data={rows} columns={columns} getRowKey={(r) => r.id} />,
    );
    expect(screen.getByText("Module A")).toBeInTheDocument();
    expect(screen.getByText("Module B")).toBeInTheDocument();
    expect(screen.getByText("Module C")).toBeInTheDocument();
  });

  it("renders sub-rows when getSubRow returns content", () => {
    renderWithMantine(
      <DataTableWithResults
        data={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        getSubRow={(r) => (r.reason ? r.reason : null)}
      />,
    );
    expect(screen.getByText("Version mismatch")).toBeInTheDocument();
  });

  it("does not render sub-rows when getSubRow returns null", () => {
    renderWithMantine(
      <DataTableWithResults
        data={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        getSubRow={(r) => (r.reason ? r.reason : null)}
      />,
    );
    // Only one sub-row (Module B), not three
    const cells = screen.getAllByRole("cell");
    const subRowCells = cells.filter((cell) => cell.getAttribute("colspan") !== null);
    expect(subRowCells).toHaveLength(1);
  });

  it("does not render sub-rows when getSubRow is not provided", () => {
    renderWithMantine(
      <DataTableWithResults data={rows} columns={columns} getRowKey={(r) => r.id} />,
    );
    const cells = screen.getAllByRole("cell");
    const subRowCells = cells.filter((cell) => cell.getAttribute("colspan") !== null);
    expect(subRowCells).toHaveLength(0);
  });

  it("shows empty message when data is empty", () => {
    renderWithMantine(
      <DataTableWithResults
        data={[]}
        columns={columns}
        getRowKey={(r: TestRow) => r.id}
        emptyMessage="Nothing here"
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("sub-row spans all columns", () => {
    renderWithMantine(
      <DataTableWithResults
        data={[mismatched]}
        columns={columns}
        getRowKey={(r) => r.id}
        getSubRow={(r) => r.reason}
      />,
    );
    const subRowCell = screen
      .getAllByRole("cell")
      .find((cell) => cell.getAttribute("colspan") !== null);
    expect(subRowCell).toBeDefined();
    expect(subRowCell?.getAttribute("colspan")).toBe(String(columns.length));
  });

  it("shows loading skeletons when loading", () => {
    const { container } = renderWithMantine(
      <DataTableWithResults
        data={[]}
        columns={columns}
        getRowKey={(r: TestRow) => r.id}
        loading
      />,
    );
    expect(container.querySelectorAll(".mantine-Skeleton-root").length).toBeGreaterThan(0);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  describe("On a phone", () => {
    beforeEach(() => {
      media.isMobile = true;
    });

    it("draws a card per row rather than a table", () => {
      renderWithMantine(
        <DataTableWithResults data={rows} columns={columns} getRowKey={(r) => r.id} />,
      );

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByText("Module A")).toBeInTheDocument();
      expect(screen.getAllByText("Name:")).toHaveLength(3);
    });

    it("puts a row's result detail inside its card", () => {
      renderWithMantine(
        <DataTableWithResults
          data={rows}
          columns={columns}
          getRowKey={(r) => r.id}
          getSubRow={(r) => (r.reason ? r.reason : null)}
        />,
      );

      expect(screen.getByText("Version mismatch")).toBeInTheDocument();
    });

    it("shows card skeletons while loading", () => {
      renderWithMantine(
        <DataTableWithResults data={[]} columns={columns} getRowKey={(r) => r.id} loading />,
      );

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });
});
