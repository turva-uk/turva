import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";

import { api, ApiError } from "../api/client";
import type { DocumentNode, SafetyDocumentDetail } from "../api/types";
import documentClasses from "../components/safety/DocumentNodes.module.css";
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
  expect(screen.getByText("0123456789abcdef0123456789abcdef01234567")).toBeInTheDocument();
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
  expect(within(region).getByRole("cell", { name: "4" })).toHaveClass(
    documentClasses.alignCenter ?? "missing-css-module-class",
  );
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
  const main = document.querySelector(
    `.${documentClasses.document ?? "missing-css-module-class"}`,
  );
  if (!(main instanceof HTMLElement)) throw new Error("The document did not render");
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
    "/safety-files/demo/documents/risk-management-plan/#doc-4-risk-assessment",
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
      source: "This untrusted extra field must not display a stale hazard log.",
    }),
  );
  show("/safety-files/demo/documents/hazard-log");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The committed hazard log does not match",
  );
  expect(screen.queryByText(/no content in the committed version/)).toBeNull();
  expect(screen.queryByText(/untrusted extra field/)).toBeNull();
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
  for (let attempts = 0; document.activeElement !== plan && attempts < 20; attempts += 1) {
    await user.tab();
  }
  expect(plan).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(spy).toHaveBeenLastCalledWith(
    "/safety-files/demo/documents/risk-management-plan/",
    expect.anything(),
  );
});

it.each(["#doc-overview%", "#doc-%E0%A4%A"])(
  "does not crash when a fragment has malformed percent encoding: %s",
  async (hash) => {
    vi.spyOn(api, "get").mockResolvedValue(detail([text("Recorded evidence")]));
    show(`/safety-files/demo/documents/overview${hash}`);
    expect(await screen.findByText("Recorded evidence")).toBeInTheDocument();
  },
);

it("encodes document fragments once and scrolls to the literal heading id", async () => {
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scroll,
  });
  const fragment = "100% reviewed";
  vi.spyOn(api, "get").mockResolvedValue(
    detail([
      { type: "element", tag: "h2", attrs: { id: fragment }, children: [text("Section")] },
      { type: "anchor", fragment, children: [text("Here")] },
      {
        type: "document",
        document: "risk-management-plan",
        fragment,
        children: [text("There")],
      },
    ]),
  );
  show("/safety-files/demo/documents/overview#doc-100%25%20reviewed");
  await screen.findByText("Section");
  // The page scrolls in an effect after the heading appears, so wait for
  // the call rather than checking at once: under a full parallel run the
  // check could come first.
  await waitFor(() => expect(scroll).toHaveBeenCalled());
  expect(scroll.mock.contexts[0]).toBe(document.getElementById("doc-100% reviewed"));
  expect(screen.getByRole("link", { name: "Here" })).toHaveAttribute(
    "href",
    "#doc-100%25%20reviewed",
  );
  expect(screen.getByRole("link", { name: "There" })).toHaveAttribute(
    "href",
    "/safety-files/demo/documents/risk-management-plan/#doc-100%25%20reviewed",
  );
});

it("shows omitted heading content in both ordinary and collapsible admonitions", async () => {
  vi.spyOn(api, "get").mockResolvedValue(
    detail(
      [false, true].map((collapsible) => ({
        type: "admonition",
        kind: "warning",
        title: "Warning",
        title_nodes: [
          text("Warning "),
          { type: "unsupported", description: "An image (Diagram) is not displayed in Turva." },
        ],
        collapsible,
        children: [text("Recorded evidence")],
      })),
      { unsupported: 2 },
    ),
  );
  show();
  await screen.findByRole("heading", { name: "Overview" });
  expect(screen.getAllByText(/Not shown: An image \(Diagram\)/)).toHaveLength(2);
  expect(document.querySelector("summary")).toHaveTextContent("Not shown: An image (Diagram)");
  expect(screen.getByText("Some content is not shown")).toBeInTheDocument();
  expect(document.querySelector(".safety-document img")).toBeNull();
});

it("shows unsupported formatting only as exact, escaped committed source", async () => {
  const source =
    '<span style="text-decoration:line-through">Approved for deployment</span>\n' +
    '</code></pre><script>alert(1)</script><img src="https://example.org/pixel">';
  vi.spyOn(api, "get").mockResolvedValue(
    detail([text("Misleading converted approval")], {
      available: false,
      reason: "unsupported-formatting",
      message: "No formatted interpretation is shown. Review the committed Markdown source.",
      source,
    }),
  );
  show();
  expect(await screen.findByRole("alert")).toHaveTextContent("Formatted view unavailable");
  const region = screen.getByRole("region", { name: "Committed Markdown source" });
  expect(region).toHaveAttribute("tabindex", "0");
  expect(region.querySelector("code")?.textContent).toBe(source);
  expect(region.querySelector("script, img, iframe, style, span, [style]")).toBeNull();
  expect(screen.queryByText("Misleading converted approval")).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
  const user = userEvent.setup();
  for (let attempts = 0; document.activeElement !== region && attempts < 20; attempts += 1) {
    await user.tab();
  }
  expect(region).toHaveFocus();
});

it.each([
  "/safety-files/%2E/documents/overview",
  "/safety-files/demo/documents/%2E%2E",
  "/safety-files/ward%2Flist/documents/overview",
])("refuses invalid route identities before constructing a request: %s", async (path) => {
  const spy = vi.spyOn(api, "get");
  show(path);
  expect(await screen.findByRole("alert")).toHaveTextContent("identifier is invalid");
  expect(spy).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: "All safety files" })).toHaveAttribute(
    "href",
    "/safety-files",
  );
});

it("keeps deleted text visibly deleted and preserves an initially open details block", async () => {
  vi.spyOn(api, "get").mockResolvedValue(
    detail([
      { type: "element", tag: "del", children: [text("Approved for deployment")] },
      {
        type: "admonition",
        kind: "warning",
        title: "Check before use",
        collapsible: true,
        open: true,
        children: [text("Not approved")],
      },
    ]),
  );
  show();
  expect((await screen.findByText("Approved for deployment")).tagName).toBe("DEL");
  expect(document.querySelector("details")).toHaveAttribute("open");
});

it("does not flatten unsupported response formatting or navigate a dot-segment document link", async () => {
  vi.spyOn(api, "get").mockResolvedValue(
    detail([
      { type: "element", tag: "unrecognised-deletion", children: [text("Disguised approval")] },
      { type: "document", document: "..", children: [text("Invalid destination")] },
    ]),
  );
  show();
  expect(await screen.findByText(/unsupported document formatting/)).toBeInTheDocument();
  expect(screen.queryByText("Disguised approval")).toBeNull();
  expect(screen.getByText(/Invalid destination/).closest("a")).toBeNull();
  expect(screen.getByText(/invalid document identifier/)).toBeInTheDocument();
});

it("removes a previous source view while another document loads", async () => {
  let resolvePlan: (value: SafetyDocumentDetail) => void = () => {};
  vi.spyOn(api, "get")
    .mockResolvedValueOnce(
      detail([], {
        available: false,
        reason: "unsupported-formatting",
        source: "Previous committed source",
        message: "Formatted view unavailable.",
      }),
    )
    .mockImplementationOnce(
      () =>
        new Promise<SafetyDocumentDetail>((resolve) => {
          resolvePlan = resolve;
        }),
    );
  show();
  await screen.findByText("Previous committed source");
  await userEvent
    .setup()
    .click(screen.getByRole("link", { name: "Clinical risk management plan" }));
  expect(screen.queryByText("Previous committed source")).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent("Loading the document");
  resolvePlan(
    detail([text("Plan content")], {
      key: "risk-management-plan",
      title: "Clinical risk management plan",
    }),
  );
  expect(await screen.findByText("Plan content")).toBeInTheDocument();
});
