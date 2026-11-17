/**
 * Sample hazard rows for the table stories.
 *
 * Shaped like a row of a safety file's hazard log, so the tables show
 * what Turva puts in them. Each risk level is the one Turva's matrix in
 * `safety_file/risk.py` gives for that severity and likelihood. They are
 * written out here, never worked out, because the browser never derives
 * a risk level (TH-008 in `SAFETY.md`).
 */

export type HazardStatus = "open" | "closed" | "transferred";

export interface HazardRow {
  id: string;
  title: string;
  owner: string;
  status: HazardStatus;
  severity: number;
  likelihood: number;
  riskLabel: string;
}

/** Severity, likelihood and the level the server's matrix gives them. */
const ASSESSMENTS = [
  { severity: 4, likelihood: 3, riskLabel: "Mandatory elimination" },
  { severity: 4, likelihood: 1, riskLabel: "Acceptable if cost of reduction exceeds benefit" },
  { severity: 3, likelihood: 2, riskLabel: "Undesirable" },
  { severity: 2, likelihood: 2, riskLabel: "Acceptable if cost of reduction exceeds benefit" },
  { severity: 5, likelihood: 1, riskLabel: "Undesirable" },
  { severity: 1, likelihood: 1, riskLabel: "Acceptable" },
] as const;

const TITLES = [
  "Wrong patient record opened from the ward list",
  "Allergy not shown on the prescribing screen",
  "Discharge summary sent to the wrong practice",
  "Test result filed without being reviewed",
  "Referral lost when the interface is down",
  "Duplicate record created at registration",
  "Dose shown in the wrong unit",
  "Clinical note saved against the wrong episode",
  "Alert suppressed after a system update",
] as const;

export const HAZARD_OWNERS = ["Clinical Safety Officer", "Deployment lead"] as const;

const STATUSES: HazardStatus[] = ["open", "open", "open", "closed", "transferred"];

function pick<T>(list: readonly T[], index: number): T {
  const value = list[index % list.length];
  if (value === undefined) throw new Error("pick() needs a non-empty list");

  return value;
}

/** Forty-five hazards, enough for several pages of a table. */
export const hazardRows: HazardRow[] = Array.from({ length: 45 }, (_, i) => {
  const assessment = pick(ASSESSMENTS, i);

  return {
    id: `H-${String(i + 1).padStart(3, "0")}`,
    title: pick(TITLES, i),
    owner: pick(HAZARD_OWNERS, i),
    status: pick(STATUSES, i),
    ...assessment,
  };
});

export const hazardFilterData = [
  {
    group: "Status",
    items: [
      { value: "status:open", label: "Open" },
      { value: "status:closed", label: "Closed" },
      { value: "status:transferred", label: "Transferred" },
    ],
  },
  {
    group: "Owner",
    items: HAZARD_OWNERS.map((owner) => ({ value: `owner:${owner}`, label: owner })),
  },
];

/** Keeps a row when it matches every chosen group, and any choice within one. */
export function hazardFilterPredicate(filters: string[]) {
  const statuses = filters.filter((f) => f.startsWith("status:")).map((f) => f.slice(7));
  const owners = filters.filter((f) => f.startsWith("owner:")).map((f) => f.slice(6));

  return (row: HazardRow) =>
    (statuses.length === 0 || statuses.includes(row.status)) &&
    (owners.length === 0 || owners.includes(row.owner));
}
