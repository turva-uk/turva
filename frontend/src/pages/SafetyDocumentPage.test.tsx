import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";

import { api, ApiError } from "../api/client";
import type { DocumentNode, SafetyDocumentDetail } from "../api/types";
import { SafetyDocumentPage } from "./SafetyDocumentPage";

afterEach(() => vi.restoreAllMocks());

const DOCUMENTS = [
  { key: "overview", title: "Overview" },
  { key: "risk-management-plan", title: "Clinical risk management plan" },
  { key: "hazard-log", title: "Hazard log" },
  { key: "safety-case-report", title: "Clinical safety case report" },
];

function detail(
  blocks: DocumentNode[],
  overrides: Partial<SafetyDocumentDetail["document"]> = {},
): SafetyDocumentDetail {
  return {
    safety_file: {
      name: "Fictional file",
      slug: "demo",
    } as SafetyDocumentDetail["safety_file"],
    documents: DOCUMENTS,
    head_sha: "0123456789abcdef0123456789abcdef01234567",
    last_changed: {
      short_sha: "01234567",
      subject: "feat: scaffold",
      author_name: "Fictional CSO",
      author_email: "cso@example.org",
      committed_at: "2026-11-10T10:00:00Z",
    },
    document: {
      key: "overview",
      title: "Overview",
      path: "docs/index.md",
      source_commit: "0123456789abcdef0123456789abcdef01234567",
      available: true,
      blocks,
      unsupported: 0,
      ...overrides,
    },
  };
}

function show(path = "/safety-files/demo/documents/overview") {
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/safety-files/:slug/documents/:documentKey"
            element={<SafetyDocumentPage />}
          />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

const text = (value: string): DocumentNode => ({ type: "text", text: value });

it("renders the committed document with its source commit and table structure", async () => {
  const spy = vi.spyOn(api, "get").mockResolvedValue(
    detail([
      { type: "element", tag: "h1", attrs: { id: "overview" }, children: [text("Fictional")] },
      {
        type: "admonition",
        kind: "danger",
        title: "Residual risk requires elimination: HAZ-002",
        collapsible: false,
        children: [{ type: "element", tag: "p", children: [text("Do not go live.")] }],
      },
      {
        type: "element",
        tag: "table",
        children: [
          {
            type: "element",
            tag: "tbody",
            children: [
              {
                type: "element",
                tag: "tr",
                children: [
                  { type: "element", tag: "th", children: [text("Severity")] },
                  {
                    type: "element",
                    tag: "td",
                    attrs: { align: "center" },
                    children: [text("4")],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]),
  );
  show();
  expect(
    await screen.findByRole("heading", { name: "Overview", level: 1 }),
  ).toBeInTheDocument();
  expect(spy).toHaveBeenCalledWith("/safety-files/demo/documents/overview/", expect.anything());
  expect(screen.getByText("0123456789ab")).toHaveAttribute(
    "title",
    "0123456789abcdef0123456789abcdef01234567",
  );
  expect(screen.getByText(/Last changed in/)).toHaveTextContent("Fictional CSO");
  expect(document.getElementById("doc-overview")).toHaveTextContent("Fictional");
  // One h1 per page: the document's own outline sits beneath the page title.
  expect(document.getElementById("doc-overview")?.tagName).toBe("H2");
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(
    screen.getByRole("complementary", { name: /Residual risk requires elimination/ }),
  ).toHaveTextContent("Do not go live.");
  const region = screen.getByRole("region", { name: /Table/ });
  expect(region).toHaveAttribute("tabindex", "0");
  expect(within(region).getByRole("cell", { name: "4" })).toHaveClass("align-center");
  expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

it("never executes, fetches or styles from document content", async () => {
  vi.spyOn(api, "get").mockResolvedValue(
    detail(
      [
        {
          type: "element",
          tag: "p",
          children: [
            text('<script>alert("x")</script><img src=x onerror=alert(1)>'),
            {
              type: "unsupported",
              description: "An image (diagram) is not displayed in Turva.",
            },
            { type: "external", href: "javascript:alert(1)", children: [text("disguised")] },
            { type: "external", href: "https://digital.nhs.uk/", children: [text("NHS")] },
            { type: "reference", text: "source reference: hazards/HAZ-001.md" },
            {
              type: "document",
              document: "risk-management-plan",
              fragment: "4-risk-assessment",
              children: [text("the plan")],
            },
          ],
        },
        // A tag outside the allowlist is never created, even if the API sent it.
        { type: "element", tag: "script", children: [text("alert(2)")] },
        { type: "element", tag: "img", attrs: { id: "x" } },
      ],
      { unsupported: 1 },
    ),
  );
  show();
  await screen.findByRole("heading", { name: "Overview", level: 1 });
  const main = document.querySelector(".safety-document") as HTMLElement;
  expect(main.querySelector("script, img, iframe, style, [style], [onerror]")).toBeNull();
  expect(main).toHaveTextContent('<script>alert("x")</script>');
  expect(screen.getByText(/Not shown: An image \(diagram\)/)).toBeInTheDocument();
  expect(screen.getByText("disguised").closest("a")).toBeNull();
  expect(screen.getByRole("link", { name: /NHS/ })).toHaveAttribute(
    "rel",
    "noopener noreferrer nofollow",
  );
  expect(screen.getByRole("link", { name: "the plan" })).toHaveAttribute(
    "href",
    "/safety-files/demo/documents/risk-management-plan#doc-4-risk-assessment",
  );
  expect(screen.getByText(/source reference: hazards\/HAZ-001.md/)).toBeInTheDocument();
  expect(screen.getByText("Some content is not shown")).toBeInTheDocument();
});

it("shows an unavailable document honestly rather than as empty", async () => {
  vi.spyOn(api, "get").mockResolvedValue(
    detail([], {
      key: "hazard-log",
      title: "Hazard log",
      available: false,
      reason: "hazard-log-out-of-date",
      message: "The committed hazard log does not match the recorded hazard assessments.",
    }),
  );
  show("/safety-files/demo/documents/hazard-log");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The committed hazard log does not match",
  );
  expect(screen.queryByText(/no content in the committed version/)).toBeNull();
});

it("reports a failed or forbidden read as an error, not an empty document", async () => {
  vi.spyOn(api, "get").mockRejectedValue(new ApiError(404, "Not found."));
  show("/safety-files/demo/documents/overview");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "That document does not exist in this safety file, or you do not have access to it.",
  );
});

it("moves between the documents by keyboard", async () => {
  const spy = vi.spyOn(api, "get").mockResolvedValue(detail([text("Overview text")]));
  show();
  await screen.findByRole("heading", { name: "Overview", level: 1 });
  const user = userEvent.setup();
  const plan = screen.getByRole("link", { name: "Clinical risk management plan" });
  while (document.activeElement !== plan) await user.tab();
  await user.keyboard("{Enter}");
  expect(spy).toHaveBeenLastCalledWith(
    "/safety-files/demo/documents/risk-management-plan/",
    expect.anything(),
  );
});
