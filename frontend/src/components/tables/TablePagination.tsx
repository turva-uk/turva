/**
 * TablePagination Compound Component
 *
 * Composable pagination controls. Render the parts you need:
 * - TablePagination (wrapper with centred layout)
 * - TablePagination.Nav - prev/next arrows with "Page X of Y"
 * - TablePagination.PageSize - items-per-page menu
 *
 * @example
 * <TablePagination>
 *   <TablePagination.Nav total={10} value={3} onChange={setPage} />
 *   <TablePagination.PageSize value={20} onChange={setPageSize} />
 * </TablePagination>
 */

import type { ReactNode } from "react";
import { Group, Menu, Pagination, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@/components/icons/appIcons";
import { BodyText } from "@/components/typography";
import { PAGE_SIZE_OPTIONS } from "./tablePaginationConstants";
import classes from "./TablePagination.module.css";

/* ---------- Root wrapper ---------- */

interface TablePaginationRootProps {
  children: ReactNode;
}

function TablePaginationRoot({ children }: TablePaginationRootProps) {
  return <Group justify="center">{children}</Group>;
}

/* ---------- Nav sub-component ---------- */

export interface TablePaginationNavProps {
  /** Total number of pages */
  total: number;
  /** Currently active page (1-indexed) */
  value: number;
  /** Called when the user selects a different page */
  onChange: (page: number) => void;
}

function Nav({ total, value, onChange }: TablePaginationNavProps) {
  if (total <= 1) return null;

  return (
    <Pagination.Root total={total} value={value} onChange={onChange}>
      <Group gap="xs">
        <Pagination.Previous aria-label="Previous page" className={classes.arrow} />
        <BodyText>
          Page {value} of {total}
        </BodyText>
        <Pagination.Next aria-label="Next page" className={classes.arrow} />
      </Group>
    </Pagination.Root>
  );
}

/* ---------- PageSize sub-component ---------- */

export interface TablePaginationPageSizeProps {
  /** Current page size */
  value: number;
  /** Called when the user changes page size */
  onChange: (size: number) => void;
}

function PageSize({ value, onChange }: TablePaginationPageSizeProps) {
  return (
    <Group gap="xs">
      <BodyText>Items per page:</BodyText>
      <Menu withInitialFocusPlaceholder={false}>
        <Menu.Target>
          <UnstyledButton
            className={classes.pageSizeButton}
            aria-label={`Items per page: ${value}`}
          >
            <Group gap={4}>
              <BodyText>{value}</BodyText>
              <IconChevronDown size={20} />
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          {PAGE_SIZE_OPTIONS.map((option, index) => (
            <Menu.Item
              key={option}
              data-autofocus={index === 0 || undefined}
              onClick={() => onChange(option)}
            >
              {option}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}

/* ---------- Compound export ---------- */

const TablePagination = Object.assign(TablePaginationRoot, {
  Nav,
  PageSize,
});

export default TablePagination;
