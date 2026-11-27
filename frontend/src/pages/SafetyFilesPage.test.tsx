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
  it("lists the files in a table named for a screen reader", async () => {
    const fetcher = answer([file]);
    renderWithRouter(<SafetyFilesPage />);

    await screen.findByText(file.name);
    const table = screen.getByRole("table", { name: "Safety files" });

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

  it("puts the create button in the table's bar, not the page heading", async () => {
    answer([file]);
    renderWithRouter(<SafetyFilesPage />);

    const create = await screen.findByRole("button", { name: "Create safety file" });
    const heading = screen.getByRole("heading", { level: 1, name: "Your safety files" });

    const bar = create.closest(".mantine-Group-root");

    expect(bar).toContainElement(screen.getByRole("button", { name: "Open search" }));
    expect(bar).not.toContainElement(heading);
  });

  it("keeps the create button while the files load", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    renderWithRouter(<SafetyFilesPage />);

    expect(screen.getByRole("button", { name: "Create safety file" })).toBeInTheDocument();
  });
});
