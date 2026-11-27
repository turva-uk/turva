/**
 * PDFDownload Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api, ApiError } from "@/api/client";
import { renderWithMantine } from "@/test/test-utils";

import PDFDownload from "./PDFDownload";

const HEAD = "a".repeat(40);

function catchClicks(): string[] {
  const clicks: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicks.push(this.download);
  });

  return clicks;
}

function stubObjectUrls() {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:fictional-pdf"),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
}

describe("PDFDownload", () => {
  it("requests the opened version and prepares a clearly named draft download", async () => {
    const download = vi.spyOn(api, "download").mockResolvedValue(new Blob(["%PDF-example"]));
    stubObjectUrls();
    const clicks = catchClicks();
    const { unmount } = renderWithMantine(<PDFDownload slug="demo" head={HEAD} />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Download draft safety file (PDF)" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "PDF prepared for version aaaaaaaa",
    );
    expect(download).toHaveBeenCalledWith(`/safety-files/demo/pdf/?expected_head=${HEAD}`);
    expect(clicks).toEqual(["demo-aaaaaaaa.pdf"]);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fictional-pdf");
  });

  it("shows a stale or build failure without claiming a PDF was prepared", async () => {
    const download = vi
      .fn()
      .mockRejectedValue(
        new ApiError(409, "This safety file changed. Reload it before downloading."),
      );
    renderWithMantine(<PDFDownload slug="demo" head={HEAD} download={download} />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Download draft safety file (PDF)" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This safety file changed");
    expect(screen.queryByText(/PDF prepared/)).not.toBeInTheDocument();
  });

  it("asks once, however quickly the button is pressed", async () => {
    let finish: (file: Blob) => void = () => undefined;
    const download = vi.fn(
      () =>
        new Promise<Blob>((resolve) => {
          finish = resolve;
        }),
    );
    stubObjectUrls();
    catchClicks();
    renderWithMantine(<PDFDownload slug="demo" head={HEAD} download={download} />);

    const button = screen.getByRole("button", { name: "Download draft safety file (PDF)" });
    const user = userEvent.setup();
    await user.click(button);
    await user.click(button);
    finish(new Blob(["%PDF-example"]));

    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(download).toHaveBeenCalledTimes(1);
  });

  it("names the version it is fixed to, and says it is a draft", () => {
    renderWithMantine(<PDFDownload slug="demo" head={HEAD} />);

    expect(screen.getByText(/Fixed to version aaaaaaaa\./)).toBeInTheDocument();
  });
});
