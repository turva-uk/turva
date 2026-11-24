import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";

import { renderWithMantine } from "@/test/test-utils";
import { SAMPLE_HISTORY } from "@/test/safetyFile";
import AuditTrailTable from "./AuditTrailTable";

describe("AuditTrailTable", () => {
  it("names the table by its label for a screen reader", () => {
    renderWithMantine(<AuditTrailTable history={SAMPLE_HISTORY} label="Change history" />);

    expect(screen.getByRole("table", { name: "Change history" })).toBeInTheDocument();
  });

  it("shows each commit's reference, change, author and email", () => {
    renderWithMantine(<AuditTrailTable history={SAMPLE_HISTORY} label="History" />);
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
    renderWithMantine(<AuditTrailTable history={SAMPLE_HISTORY} label="History" />);
    const [commit] = SAMPLE_HISTORY;

    expect(
      document.querySelector(`time[datetime="${commit?.committed_at}"]`),
    ).toBeInTheDocument();
  });

  it("says so when nothing has been recorded", () => {
    renderWithMantine(<AuditTrailTable history={[]} label="History" />);

    expect(screen.getByText("No changes recorded yet.")).toBeInTheDocument();
  });
});
