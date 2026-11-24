/**
 * SafetyDocumentSheet Component Tests
 *
 * What the document body may contain is tested on `DocumentNodes`, which
 * renders it.
 */

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import type { SafetyFileStatus } from "@/lib/safety";
import { renderWithMantine } from "@/test/test-utils";

import SafetyDocumentSheet from "./SafetyDocumentSheet";

const COMMIT = "abcdef12" + "0".repeat(32);

describe("SafetyDocumentSheet", () => {
  it("names the system, the status and the full commit", () => {
    renderWithMantine(
      <SafetyDocumentSheet system="BP@Home" status="draft" commit={COMMIT}>
        Body
      </SafetyDocumentSheet>,
    );

    expect(screen.getByText("BP@Home")).toBeInTheDocument();
    expect(screen.getByText("Draft, not approved")).toBeInTheDocument();
    expect(screen.getByText(`As at commit ${COMMIT}`)).toBeInTheDocument();
  });

  it("shows the document it is given", () => {
    renderWithMantine(
      <SafetyDocumentSheet system="BP@Home" commit={COMMIT}>
        <p>Recorded evidence</p>
      </SafetyDocumentSheet>,
    );

    expect(screen.getByTestId("safety-document-sheet")).toHaveTextContent("Recorded evidence");
  });

  it("shows no status when none is given, rather than assuming one", () => {
    renderWithMantine(
      <SafetyDocumentSheet system="BP@Home" commit={COMMIT}>
        Body
      </SafetyDocumentSheet>,
    );

    expect(screen.queryByText(/Draft|approved|accepted/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says so when a status is one it does not know", () => {
    renderWithMantine(
      <SafetyDocumentSheet
        system="BP@Home"
        status={"archived" as SafetyFileStatus}
        commit={COMMIT}
      >
        Body
      </SafetyDocumentSheet>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unsupported recorded status: archived.",
    );
  });

  it.each([null, "abcdef12", "not-a-version"])(
    "warns when there is no full source commit: %s",
    (commit) => {
      renderWithMantine(
        <SafetyDocumentSheet system="BP@Home" commit={commit}>
          Body
        </SafetyDocumentSheet>,
      );

      expect(
        screen.getByRole("alert", { name: "Source version unavailable" }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/^As at commit/)).not.toBeInTheDocument();
    },
  );
});
