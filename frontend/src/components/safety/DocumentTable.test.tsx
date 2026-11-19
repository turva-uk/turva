/**
 * DocumentTable Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import { SAMPLE_DOCUMENTS } from "@/test/safetyFile";
import DocumentTable from "./DocumentTable";

describe("DocumentTable", () => {
  it("lists each document by its title", () => {
    renderWithRouter(<DocumentTable documents={SAMPLE_DOCUMENTS} />);
    expect(screen.getByText("Clinical Risk Management Plan")).toBeInTheDocument();
    expect(screen.getByText("Clinical Safety Case Report")).toBeInTheDocument();
  });

  it("reports the document chosen", async () => {
    const onSelect = vi.fn();
    renderWithRouter(<DocumentTable documents={SAMPLE_DOCUMENTS} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("Clinical Safety Case Report"));
    expect(onSelect).toHaveBeenCalledWith(SAMPLE_DOCUMENTS[2]);
  });

  it("says so when there are none", () => {
    renderWithRouter(<DocumentTable documents={[]} />);
    expect(screen.getByText("No documents in this safety file")).toBeInTheDocument();
  });
});
