/**
 * TablePagination Stories
 *
 * Demonstrates the compound pagination control with Nav and PageSize parts.
 */

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { VariantStack, VariantRow } from "@/stories/variants";
import TablePagination from "./TablePagination";

const meta: Meta<typeof TablePagination> = {
  title: "Tables/Table pagination",
  component: TablePagination,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof TablePagination>;

function InteractivePagination() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalItems = 95;
  const total = Math.ceil(totalItems / pageSize);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <TablePagination>
      <TablePagination.Nav total={total} value={page} onChange={setPage} />
      <TablePagination.PageSize value={pageSize} onChange={handlePageSizeChange} />
    </TablePagination>
  );
}

export const Default: Story = {
  render: () => <InteractivePagination />,
};

export const KeyboardOpenPageSize: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Items per page: 10" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body.getByRole("menuitem", { name: "10" })).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    await expect(body.getByRole("menuitem", { name: "20" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByText("Page 1 of 5")).toBeVisible();
    const updated = canvas.getByRole("button", { name: "Items per page: 20" });
    updated.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body.getByRole("menuitem", { name: "10" })).toHaveFocus());
  },
};

export const AllStates: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="Nav + PageSize" horizontal={false}>
        <TablePagination>
          <TablePagination.Nav total={10} value={3} onChange={() => {}} />
          <TablePagination.PageSize value={10} onChange={() => {}} />
        </TablePagination>
      </VariantRow>
      <VariantRow label="Nav only" horizontal={false}>
        <TablePagination>
          <TablePagination.Nav total={5} value={1} onChange={() => {}} />
        </TablePagination>
      </VariantRow>
      <VariantRow label="PageSize only" horizontal={false}>
        <TablePagination>
          <TablePagination.PageSize value={20} onChange={() => {}} />
        </TablePagination>
      </VariantRow>
      <VariantRow label="Nav hidden (1 page)" horizontal={false}>
        <TablePagination>
          <TablePagination.Nav total={1} value={1} onChange={() => {}} />
          <TablePagination.PageSize value={10} onChange={() => {}} />
        </TablePagination>
      </VariantRow>
    </VariantStack>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <VariantStack>
      <VariantRow label="Nav + PageSize" horizontal={false}>
        <TablePagination>
          <TablePagination.Nav total={10} value={5} onChange={() => {}} />
          <TablePagination.PageSize value={10} onChange={() => {}} />
        </TablePagination>
      </VariantRow>
      <VariantRow label="Nav only" horizontal={false}>
        <TablePagination>
          <TablePagination.Nav total={5} value={1} onChange={() => {}} />
        </TablePagination>
      </VariantRow>
    </VariantStack>
  ),
  globals: { colorScheme: "dark" },
};
