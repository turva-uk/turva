import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "@mantine/core";
import { renderWithMantine } from "@/test/test-utils";
import DataTable, { type DataTableProps } from "./DataTable";
import DataTableWithResults from "./DataTableWithResults";

const media = vi.hoisted(() => ({ isMobile: false }));
vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: () => media.isMobile };
});

interface Row {
  id: string;
  title: string;
}
type Props = Pick<DataTableProps<Row>, "data" | "columns" | "getRowKey" | "onRowClick">;
const data = [{ id: "HAZ-001", title: "Incorrect record opened" }];
const getRowKey = (row: Row) => row.id;
const columns: Props["columns"] = [{ header: "Title", render: (row) => row.title }];
const variants = [
  ["DataTable", (props: Props) => <DataTable {...props} />],
  ["DataTableWithResults", (props: Props) => <DataTableWithResults {...props} />],
] as const;

beforeEach(() => {
  media.isMobile = false;
});

describe.each(variants)("%s row actions", (_name, table) => {
  describe.each([false, true])("card layout: %s", (mobile) => {
    beforeEach(() => {
      media.isMobile = mobile;
    });

    it("offers a native, labelled keyboard action without changing table semantics", async () => {
      const user = userEvent.setup();
      const open = vi.fn();
      renderWithMantine(table({ data, columns, getRowKey, onRowClick: open }));
      const action = screen.getByRole("button", { name: "Open record HAZ-001" });
      action.focus();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");
      expect(open).toHaveBeenCalledTimes(2);
      expect(open).toHaveBeenLastCalledWith(data[0]);
      if (!mobile) expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("retains the pointer shortcut on ordinary row content", async () => {
      const user = userEvent.setup();
      const open = vi.fn();
      renderWithMantine(table({ data, columns, getRowKey, onRowClick: open }));
      await user.click(screen.getByText(data[0]!.title));
      expect(open).toHaveBeenCalledExactlyOnceWith(data[0]);
    });

    it("does not treat a nested button or checkbox label as a row action", async () => {
      const user = userEvent.setup();
      const open = vi.fn();
      const edit = vi.fn();
      const controls: Props["columns"] = [
        ...columns,
        {
          header: "Review",
          render: () => (
            <>
              <button onClick={edit}>Record audit note</button>
              <div contentEditable="plaintext-only" suppressContentEditableWarning>
                Editable narrative
              </div>
              <label>
                Reviewed
                <input type="checkbox" />
              </label>
            </>
          ),
        },
      ];
      renderWithMantine(table({ data, columns: controls, getRowKey, onRowClick: open }));
      await user.click(screen.getByRole("button", { name: "Record audit note" }));
      await user.click(screen.getByText("Editable narrative"));
      await user.click(screen.getByLabelText("Reviewed"));
      expect(edit).toHaveBeenCalledOnce();
      expect(screen.getByLabelText("Reviewed")).toBeChecked();
      expect(open).not.toHaveBeenCalled();
    });

    it("does not activate a row through a portalled menu", async () => {
      const user = userEvent.setup();
      const open = vi.fn();
      const edit = vi.fn();
      const controls: Props["columns"] = [
        ...columns,
        {
          header: "Actions",
          render: () => (
            <Menu>
              <Menu.Target>
                <button>More actions</button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={edit}>Record audit note</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ),
        },
      ];
      renderWithMantine(table({ data, columns: controls, getRowKey, onRowClick: open }));
      await user.click(screen.getByRole("button", { name: "More actions" }));
      await user.click(await screen.findByRole("menuitem", { name: "Record audit note" }));
      expect(edit).toHaveBeenCalledOnce();
      expect(open).not.toHaveBeenCalled();
    });

    it("does not make read-only data look actionable", () => {
      renderWithMantine(table({ data, columns, getRowKey }));
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      const record = screen
        .getByText(data[0]!.title)
        .closest(mobile ? ".mantine-Card-root" : "tr");
      expect(record).not.toHaveStyle({ cursor: "pointer" });
    });
  });
});

describe("responsive table sorting", () => {
  const sortedColumns: Props["columns"] = [{ ...columns[0]!, accessor: (row) => row.title }];

  it("exposes the current sort through the column header", async () => {
    const user = userEvent.setup();
    renderWithMantine(<DataTable data={data} columns={sortedColumns} getRowKey={getRowKey} />);
    const sort = screen.getByRole("button", { name: "Sort by Title" });
    expect(sort.closest("th")).toHaveAttribute("aria-sort", "none");
    await user.click(sort);
    expect(sort.closest("th")).toHaveAttribute("aria-sort", "ascending");
    await user.click(sort);
    expect(sort.closest("th")).toHaveAttribute("aria-sort", "descending");
    await user.click(sort);
    expect(sort.closest("th")).toHaveAttribute("aria-sort", "none");
  });

  it("keeps sorting available and consistent when a table reflows into cards", async () => {
    media.isMobile = true;
    const user = userEvent.setup();
    const rows = [
      { id: "HAZ-001", title: "Zebra" },
      { id: "HAZ-002", title: "Alpha" },
    ];
    const view = <DataTable data={rows} columns={sortedColumns} getRowKey={getRowKey} />;
    const { rerender } = renderWithMantine(view);
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort rows" }), "0:asc");
    expect(screen.getAllByText(/^(Alpha|Zebra)$/).map((node) => node.textContent)).toEqual([
      "Alpha",
      "Zebra",
    ]);
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort rows" }), "0:desc");
    media.isMobile = false;
    rerender(<DataTable data={rows} columns={sortedColumns} getRowKey={getRowKey} />);
    expect(screen.getByRole("button", { name: "Sort by Title" }).closest("th")).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });
});

describe("unavailable and numeric results", () => {
  it.each([false, true])(
    "announces the error rather than stale result counts (loading: %s)",
    (loading) => {
      renderWithMantine(
        <DataTable
          data={data}
          columns={columns}
          getRowKey={getRowKey}
          loading={loading}
          error="Evidence unavailable"
          statusMessage="1 result"
        />,
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Error loading data: Evidence unavailable",
      );
      expect(screen.getByRole("status")).not.toHaveTextContent("1 result");
    },
  );

  it("keeps a zero-valued result inside its associated full-width table cell", () => {
    renderWithMantine(
      <DataTableWithResults
        data={data}
        columns={columns}
        getRowKey={getRowKey}
        onRowClick={vi.fn()}
        getSubRow={() => 0}
      />,
    );
    expect(screen.getByRole("cell", { name: "0" })).toHaveAttribute("colspan", "2");
  });
});
