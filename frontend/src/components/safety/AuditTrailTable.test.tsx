import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithRouter } from "@/test/test-utils";
import { SAMPLE_HISTORY } from "@/test/safetyFile";
import type { Commit } from "@/lib/safety";
import AuditTrailTable from "./AuditTrailTable";

/** A second, earlier change by somebody else, beside the shared sample. */
const EARLIER: Commit = {
  short_sha: "bbbbbbbb",
  subject: "Record HAZ-001",
  author_name: "Dr Anita Patel",
  author_email: "a.patel@riverbank.example.nhs.uk",
  committed_at: "2026-02-18T09:00:00Z",
};
const TWO_CHANGES = [...SAMPLE_HISTORY, EARLIER];

describe("AuditTrailTable", () => {
  it("names the table by its label for a screen reader", () => {
    renderWithRouter(<AuditTrailTable history={SAMPLE_HISTORY} label="Change history" />);

    expect(screen.getByRole("table", { name: "Change history" })).toBeInTheDocument();
  });

  it("shows each commit's reference, change, author and email", () => {
    renderWithRouter(<AuditTrailTable history={SAMPLE_HISTORY} label="History" />);
    const [commit] = SAMPLE_HISTORY;
    if (!commit) throw new Error("No sample history");

    const row = screen.getAllByRole("row")[1];
    if (!row) throw new Error("The table has no rows");

    expect(within(row).getByText(commit.short_sha)).toBeInTheDocument();
    expect(row).toHaveTextContent(commit.subject);
    expect(row).toHaveTextContent(commit.author_name);
    expect(row).toHaveTextContent(commit.author_email);
  });

  it("gives each time a machine-readable date", () => {
    renderWithRouter(<AuditTrailTable history={SAMPLE_HISTORY} label="History" />);
    const [commit] = SAMPLE_HISTORY;

    expect(
      document.querySelector(`time[datetime="${commit?.committed_at}"]`),
    ).toBeInTheDocument();
  });

  it("says so when nothing has been recorded", () => {
    renderWithRouter(<AuditTrailTable history={[]} label="History" />);

    expect(screen.getByText("No changes recorded yet.")).toBeInTheDocument();
  });
  it("narrows the changes to the person chosen in the filter", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AuditTrailTable history={TWO_CHANGES} label="History" />);

    await user.click(screen.getByRole("button", { name: "Filter changes by who made them" }));
    await user.click(screen.getByLabelText("Filter changes", { selector: "input" }));
    await user.click(await screen.findByRole("option", { name: "Dr Anita Patel" }));

    expect(screen.getByText(EARLIER.subject)).toBeInTheDocument();
    expect(screen.queryByText("Link MIT-001 to HAZ-001")).not.toBeInTheDocument();
  });

  it("sorts the changes by when they were made", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AuditTrailTable history={TWO_CHANGES} label="History" />);

    await user.click(screen.getByRole("button", { name: "Sort by When" }));

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent(EARLIER.subject);
    expect(rows[1]).toHaveTextContent("Link MIT-001 to HAZ-001");
  });

  it("is a record, so offers nothing to add", () => {
    renderWithRouter(<AuditTrailTable history={TWO_CHANGES} label="History" />);

    const buttons = screen.getAllByRole("button").map((button) => button.textContent ?? "");
    expect(buttons.some((label) => /add|record/i.test(label))).toBe(false);
  });
});
