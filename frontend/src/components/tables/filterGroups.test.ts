import { describe, expect, it } from "vitest";

import { filterGroups } from "./filterGroups";

interface Row {
  name: string;
  standard: string;
  visibility: string;
}

const rows: Row[] = [
  { name: "a", standard: "DCB0160", visibility: "Public" },
  { name: "b", standard: "DCB0129", visibility: "Private" },
  { name: "c", standard: "DCB0160", visibility: "Private" },
];

const groups = [
  { key: "standard", label: "Standard", valueOf: (row: Row) => row.standard },
  {
    key: "visibility",
    label: "Visibility",
    valueOf: (row: Row) => row.visibility,
    values: ["Public", "Private"],
  },
];

function names(filters: string[]): string[] {
  const { filterPredicate } = filterGroups(rows, groups);

  return rows.filter(filterPredicate(filters)).map((row) => row.name);
}

describe("filterGroups", () => {
  it("offers the values the rows hold, sorted, or the values given in order", () => {
    const { filterData } = filterGroups(rows, groups);

    expect(filterData).toEqual([
      {
        group: "Standard",
        items: [
          { value: "standard:DCB0129", label: "DCB0129" },
          { value: "standard:DCB0160", label: "DCB0160" },
        ],
      },
      {
        group: "Visibility",
        items: [
          { value: "visibility:Public", label: "Public" },
          { value: "visibility:Private", label: "Private" },
        ],
      },
    ]);
  });

  it("keeps every row when nothing is chosen", () => {
    expect(names([])).toEqual(["a", "b", "c"]);
  });

  it("widens within a group and narrows across groups", () => {
    expect(names(["standard:DCB0160", "standard:DCB0129"])).toEqual(["a", "b", "c"]);
    expect(names(["standard:DCB0160", "visibility:Private"])).toEqual(["c"]);
  });

  it("offers no filter for a table with no rows, even where values are given", () => {
    const { filterData } = filterGroups([], groups);

    expect(filterData).toEqual([]);
  });
});
