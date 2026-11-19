import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "@/test/test-utils";
import { SAMPLE_ASSIGNMENTS } from "@/test/safetyFile";
import AssignmentTable from "./AssignmentTable";

describe("AssignmentTable", () => {
  it("shows what is out with whom, who asked and since when", () => {
    renderWithRouter(<AssignmentTable assignments={SAMPLE_ASSIGNMENTS} />);

    expect(screen.getByText(/^MIT-001: /)).toBeInTheDocument();
    expect(screen.getByText("Sam Rivers")).toBeInTheDocument();
    expect(screen.getByText("Dr Anita Patel")).toBeInTheDocument();
    const timestamp = screen.getByText(/7 November 2026/);
    expect(timestamp).toHaveTextContent("09:00");
    expect(timestamp).toHaveAttribute("datetime", SAMPLE_ASSIGNMENTS[0]!.assigned_at);
    expect(screen.getByRole("columnheader", { name: /Since \(UTC\)/ })).toBeInTheDocument();
  });

  it("does not infer assignment completeness from an empty supplied list", () => {
    renderWithRouter(<AssignmentTable assignments={[]} />);

    expect(screen.getByText("No assignments were supplied.")).toBeInTheDocument();
  });
});
