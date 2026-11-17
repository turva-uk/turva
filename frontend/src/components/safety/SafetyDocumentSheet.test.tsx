/**
 * SafetyDocumentSheet Component Tests
 */

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import SafetyDocumentSheet from "./SafetyDocumentSheet";

describe("SafetyDocumentSheet", () => {
  it("names the system, the status and the commit", () => {
    renderWithMantine(
      <SafetyDocumentSheet
        system="BP@Home"
        status="draft"
        commit={"abcdef12" + "0".repeat(32)}
        text="# Report"
      />,
    );
    expect(screen.getByText("BP@Home")).toBeInTheDocument();
    expect(screen.getByText("Draft, not approved")).toBeInTheDocument();
    expect(screen.getByText("As at commit abcdef12")).toBeInTheDocument();
  });

  it("does not run script in the document's text", () => {
    renderWithMantine(
      <SafetyDocumentSheet
        system="x"
        status="draft"
        commit={null}
        text={'<img src=x onerror="alert(1)">\n\n# Heading'}
      />,
    );
    const sheet = screen.getByTestId("safety-document-sheet");
    expect(sheet.querySelector("[onerror]")).toBeNull();
    expect(sheet.querySelector("script")).toBeNull();
  });

  it("draws the document's tables, which showed as a line of pipes", () => {
    renderWithMantine(
      <SafetyDocumentSheet
        system="x"
        status="draft"
        commit={null}
        text={"| | |\n| --- | --- |\n| Name | Dr Anita Patel |"}
      />,
    );

    expect(screen.getByRole("cell", { name: "Dr Anita Patel" })).toBeInTheDocument();
    expect(screen.queryByText(/\| Name \|/)).not.toBeInTheDocument();
  });

  it("leaves out the notes a template leaves as comments", () => {
    renderWithMantine(
      <SafetyDocumentSheet
        system="x"
        status="draft"
        commit={null}
        text={"## Sign-off\n\n<!-- Completed at approval. -->\n\nSigned below."}
      />,
    );

    expect(screen.queryByText(/Completed at approval/)).not.toBeInTheDocument();
    expect(screen.getByText("Signed below.")).toBeInTheDocument();
  });
});
