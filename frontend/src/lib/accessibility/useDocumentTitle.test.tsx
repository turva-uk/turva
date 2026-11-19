import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { documentTitle, useDocumentTitle } from "./useDocumentTitle";

const original = document.title;

describe("useDocumentTitle", () => {
  afterEach(() => {
    document.title = original;
  });

  it("puts the page first and the site second", () => {
    expect(documentTitle("Settings")).toBe("Settings - Turva");
  });

  it("sets the title while mounted and restores it after", () => {
    const { unmount } = renderHook(() => useDocumentTitle("Hazard log"));
    expect(document.title).toBe(documentTitle("Hazard log"));
    unmount();
    expect(document.title).toBe(original);
  });

  it("follows a change of page title", () => {
    const { rerender } = renderHook(({ title }: { title: string }) => useDocumentTitle(title), {
      initialProps: { title: "Question 1" },
    });
    rerender({ title: "Question 2" });
    expect(document.title).toBe(documentTitle("Question 2"));
  });

  it("leaves the title alone when there is none to give", () => {
    renderHook(() => useDocumentTitle(""));
    expect(document.title).toBe(original);
  });
});
