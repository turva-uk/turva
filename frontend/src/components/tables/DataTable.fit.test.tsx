/**
 * DataTable fit tests
 *
 * The table draws cards when its own container is narrower than its
 * columns need. jsdom does no layout, so `useElementSize` is mocked to
 * report a width; the ordinary DataTable tests run at width 0, where
 * only the viewport rule applies.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import DataTable, { type Column } from "./DataTable";

const size = vi.hoisted(() => ({ width: 0 }));

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return {
    ...actual,
    useElementSize: () => ({
      ref: () => {},
      width: size.width,
      height: 0,
    }),
  };
});

interface Row {
  id: number;
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
  f: string;
  g: string;
}

const rows: Row[] = [{ id: 1, a: "a1", b: "b1", c: "c1", d: "d1", e: "e1", f: "f1", g: "g1" }];

const col = (key: keyof Row): Column<Row> => ({
  header: String(key).toUpperCase(),
  render: (row) => String(row[key]),
});

const seven = (["a", "b", "c", "d", "e", "f", "g"] as const).map(col);
const three = (["a", "b", "c"] as const).map(col);

function render(
  columns: Column<Row>[],
  extra: Partial<Parameters<typeof DataTable<Row>>[0]> = {},
) {
  return renderWithMantine(
    <DataTable data={rows} columns={columns} getRowKey={(row) => row.id} {...extra} />,
  );
}

describe("DataTable fit", () => {
  beforeEach(() => {
    size.width = 0;
  });

  it.each([0, -1, 1.5, NaN, Infinity])("refuses an invalid page size: %s", (pageSize) => {
    expect(() => render(three, { pageSize })).toThrow(/positive integer/);
  });

  it.each([0, 100])("keeps every paginated record reachable at width %i", async (width) => {
    size.width = width;
    const user = userEvent.setup();
    const data = Array.from({ length: 8 }, (_, index) => ({
      ...rows[0]!,
      id: index + 1,
      a: `Hazard ${index + 1}`,
    }));
    renderWithMantine(
      <DataTable data={data} columns={[col("a")]} getRowKey={(row) => row.id} pageSize={5} />,
    );
    expect(screen.getByText("Hazard 5")).toBeInTheDocument();
    expect(screen.queryByText("Hazard 8")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Hazard 8")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("draws seven columns as cards in 500px, since they need 896px", () => {
    size.width = 500;
    render(seven);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("a1")).toBeInTheDocument();
  });

  it("keeps three columns as a table in 500px, since they need 384px", () => {
    size.width = 500;
    render(three);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("needs no column of its own to open a row, as the first cell does it", () => {
    size.width = 688;
    render(seven.slice(0, 5), { onRowClick: vi.fn() });
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "a1" })).toBeInTheDocument();
  });

  it("lets a table say its own width with cardsBelow", () => {
    size.width = 500;
    render(three, { cardsBelow: 40 });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("lets a table ask for wider columns with minColumnWidth", () => {
    size.width = 500;
    render(three, { minColumnWidth: 12 });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("leaves the viewport rule in charge before the first measurement", () => {
    size.width = 0;
    render(seven);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("draws loading skeletons as cards when the columns do not fit", () => {
    size.width = 500;
    render(seven, { loading: true });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
