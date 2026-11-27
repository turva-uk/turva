/**
 * DocumentList Component Tests
 */

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithRouter } from "@/test/test-utils";
import { SAMPLE_DOCUMENT_LIST } from "@/test/safetyFile";

import DocumentList from "./DocumentList";

function renderList() {
  renderWithRouter(
    <DocumentList
      documents={SAMPLE_DOCUMENT_LIST}
      current="safety-case"
      href={(key) => `/safety-files/demo/documents/${key}/`}
    />,
  );
}

describe("DocumentList", () => {
  it("is named as the file's document navigation", () => {
    renderList();

    expect(screen.getByRole("navigation", { name: "Safety documents" })).toBeInTheDocument();
  });

  it("links every document to its page", () => {
    renderList();

    expect(screen.getAllByRole("link")).toHaveLength(SAMPLE_DOCUMENT_LIST.length);
    expect(screen.getByRole("link", { name: "Hazard log" })).toHaveAttribute(
      "href",
      "/safety-files/demo/documents/hazard-log/",
    );
  });

  it("marks only the document being read as the current page", () => {
    renderList();

    expect(screen.getByRole("link", { name: "Clinical safety case report" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });
});
