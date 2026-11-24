import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SafetyFile } from "../api/types";
import { SAMPLE_FILE } from "../test/safetyFile";
import { renderWithRouter } from "../test/test-utils";
import { SafetyFilesPage } from "./SafetyFilesPage";

const file = SAMPLE_FILE;

function answer(files: SafetyFile[]) {
  const fetcher = vi.fn<(url: string) => Promise<Response>>(
    async () =>
      new Response(JSON.stringify(files), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetcher);

  return fetcher;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SafetyFilesPage", () => {
  it("lists the files in a table named by its caption", async () => {
    const fetcher = answer([file]);
    renderWithRouter(<SafetyFilesPage />);

    await screen.findByText(file.name);
    const table = screen.getByRole("table", {
      name: "Safety files you own, are named on, or may read as public files",
    });

    expect(table).toHaveTextContent(file.name);
    expect(table).toHaveTextContent(file.organisation);
    expect(fetcher.mock.calls[0]?.[0]).toMatch(/\/safety-files\/$/);
  });

  it("explains what a safety file is when there are none", async () => {
    answer([]);
    renderWithRouter(<SafetyFilesPage />);

    expect(await screen.findByText("You have no safety files yet.")).toBeInTheDocument();
    expect(screen.getByText(/A safety file is a Git repository/)).toBeInTheDocument();
  });

  it("offers to create a safety file", async () => {
    answer([]);
    renderWithRouter(<SafetyFilesPage />);

    expect(
      await screen.findByRole("button", { name: "Create safety file" }),
    ).toBeInTheDocument();
  });
});
