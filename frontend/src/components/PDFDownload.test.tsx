import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { api, ApiError } from "../api/client";
import { PDFDownload } from "./PDFDownload";

afterEach(() => vi.restoreAllMocks());

it("requests the opened version and prepares a clearly named draft download", async () => {
  const download = vi.spyOn(api, "download").mockResolvedValue(new Blob(["%PDF-example"]));
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:fictional-pdf"),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  const clicks: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicks.push(this.download);
  });
  const { unmount } = render(
    <MantineProvider>
      <PDFDownload slug="demo" head={"a".repeat(40)} />
    </MantineProvider>,
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Download draft safety file (PDF)" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "PDF prepared for version aaaaaaaa",
  );
  expect(download).toHaveBeenCalledWith(
    `/safety-files/demo/pdf/?expected_head=${"a".repeat(40)}`,
  );
  expect(clicks).toEqual(["demo-aaaaaaaa.pdf"]);
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fictional-pdf");
});

it("shows a stale/build failure without claiming a PDF was prepared", async () => {
  vi.spyOn(api, "download").mockRejectedValue(
    new ApiError(409, "This safety file changed. Reload it before downloading."),
  );
  render(
    <MantineProvider>
      <PDFDownload slug="demo" head={"a".repeat(40)} />
    </MantineProvider>,
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Download draft safety file (PDF)" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("This safety file changed");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
