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
    expect(screen.getByText("7 November 2026")).toBeInTheDocument();
  });

  it("says when nothing is out", () => {
    renderWithRouter(<AssignmentTable assignments={[]} />);

    expect(screen.getByText("No mitigation is out with anybody.")).toBeInTheDocument();
  });
});
