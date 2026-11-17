/**
 * PageMessage Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { PageMessageProvider, usePageMessage } from "./PageMessageContext";
import PageMessageDisplay from "./PageMessageDisplay";
import PageHeader from "@/components/page-header";

const mockNavigate = vi.fn();
let mockLocation = {
  pathname: "/test",
  search: "",
  state: null as unknown,
};

vi.mock("react-router", () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}));

function TestConsumer() {
  const { showMessage, messages, clearAll } = usePageMessage();
  return (
    <div>
      <button onClick={() => showMessage({ variant: "success", title: "Test success" })}>
        Show success
      </button>
      <button
        onClick={() =>
          showMessage({
            variant: "error",
            title: "Test error",
            description: "Something went wrong",
          })
        }
      >
        Show error
      </button>
      <button onClick={clearAll}>Clear all</button>
      <span data-testid="message-count">{messages.length}</span>
    </div>
  );
}

function renderWithProvider(ui?: React.ReactNode) {
  return renderWithMantine(
    <PageMessageProvider>
      <PageMessageDisplay />
      <TestConsumer />
      {ui}
    </PageMessageProvider>,
  );
}

/** The first of several matching elements, failing the test if there are none. */
function firstOf(elements: HTMLElement[]): HTMLElement {
  const [first] = elements;

  if (!first) {
    throw new Error("Expected at least one element.");
  }

  return first;
}

describe("PageMessage", () => {
  beforeEach(() => {
    mockLocation = {
      pathname: "/test",
      search: "",
      state: null,
    };
    mockNavigate.mockClear();
  });

  describe("PageMessageDisplay", () => {
    it("renders nothing when no messages exist", () => {
      renderWithProvider();
      expect(screen.queryByTestId("form-status")).not.toBeInTheDocument();
    });

    it("renders a success message when showMessage is called", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText("Show success"));

      expect(screen.getByText("Test success")).toBeInTheDocument();
      expect(screen.getByTestId("form-status")).toHaveAttribute("role", "status");
    });

    it("renders an error message with description", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText("Show error"));

      expect(screen.getByText("Test error")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByTestId("form-status")).toHaveAttribute("role", "alert");
    });

    it("renders multiple messages in FIFO order", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText("Show success"));
      await user.click(screen.getByText("Show error"));

      const statuses = screen.getAllByTestId("form-status");
      expect(statuses).toHaveLength(2);
      expect(statuses[0]).toHaveAttribute("role", "status");
      expect(statuses[1]).toHaveAttribute("role", "alert");
    });
  });

  describe("Dismissal", () => {
    it("removes a single message when dismissed", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText("Show success"));
      await user.click(screen.getByText("Show error"));

      expect(screen.getAllByTestId("form-status")).toHaveLength(2);

      const dismissButtons = screen.getAllByLabelText("Dismiss");
      await user.click(firstOf(dismissButtons));

      expect(screen.getAllByTestId("form-status")).toHaveLength(1);
      expect(screen.getByText("Test error")).toBeInTheDocument();
    });

    it("clears all messages when clearAll is called", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText("Show success"));
      await user.click(screen.getByText("Show error"));
      await user.click(screen.getByText("Clear all"));

      expect(screen.queryByTestId("form-status")).not.toBeInTheDocument();
    });
  });

  describe("Without crypto.randomUUID", () => {
    // Browsers offer it only over HTTPS or on localhost, so a dev app
    // opened at a network address over plain HTTP has none.
    beforeEach(() => {
      vi.stubGlobal("crypto", {});
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("shows and dismisses messages", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByText("Show success"));
      await user.click(screen.getByText("Show error"));

      expect(screen.getAllByTestId("form-status")).toHaveLength(2);

      await user.click(firstOf(screen.getAllByLabelText("Dismiss")));

      expect(screen.getAllByTestId("form-status")).toHaveLength(1);
      expect(screen.getByText("Test error")).toBeInTheDocument();
    });

    it("ingests a flash from location state", () => {
      mockLocation = {
        pathname: "/test",
        search: "",
        state: { flash: { title: "Organisation created" } },
      };
      renderWithProvider();

      expect(screen.getByText("Organisation created")).toBeInTheDocument();
    });
  });

  describe("Flash state ingestion", () => {
    it("ingests flash from location state and renders it", () => {
      mockLocation = {
        pathname: "/test",
        search: "",
        state: { flash: { title: "Organisation created" } },
      };
      renderWithProvider();

      expect(screen.getByText("Organisation created")).toBeInTheDocument();
    });

    it("defaults to success variant when flash has no variant", () => {
      mockLocation = {
        pathname: "/test",
        search: "",
        state: { flash: { title: "Done" } },
      };
      renderWithProvider();

      expect(screen.getByTestId("form-status")).toHaveAttribute("role", "status");
    });

    it("uses specified variant from flash state", () => {
      mockLocation = {
        pathname: "/test",
        search: "",
        state: { flash: { variant: "error", title: "Failed" } },
      };
      renderWithProvider();

      expect(screen.getByTestId("form-status")).toHaveAttribute("role", "alert");
    });

    it("clears flash from history state after ingestion", async () => {
      mockLocation = {
        pathname: "/test",
        search: "",
        state: { flash: { title: "Done" } },
      };
      renderWithProvider();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/test", {
          replace: true,
          state: {},
        });
      });
    });

    it("does not call navigate when no flash is present", () => {
      mockLocation = {
        pathname: "/test",
        search: "",
        state: null,
      };
      renderWithProvider();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Beneath the page header", () => {
    /** The layout's fallback display above a page, as MainLayout has it. */
    function renderPage(page: React.ReactNode) {
      return renderWithMantine(
        <PageMessageProvider>
          <div data-testid="above-page">
            <PageMessageDisplay fallback />
          </div>
          <TestConsumer />
          {page}
        </PageMessageProvider>,
      );
    }

    it("shows a message after the header, not above the page", async () => {
      const user = userEvent.setup();
      renderPage(<PageHeader title="Edit user" />);

      await user.click(screen.getByText("Show success"));

      const message = screen.getByText("Test success");
      const heading = screen.getByRole("heading", { name: "Edit user" });
      expect(screen.getAllByText("Test success")).toHaveLength(1);
      expect(screen.getByTestId("above-page")).toBeEmptyDOMElement();
      expect(
        heading.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("shows a message above a page that has no header", async () => {
      const user = userEvent.setup();
      renderPage(<p>No header here</p>);

      await user.click(screen.getByText("Show success"));

      expect(screen.getByTestId("above-page")).toHaveTextContent("Test success");
    });

    it("shows a message once when a page has two headers", async () => {
      const user = userEvent.setup();
      renderPage(
        <>
          <PageHeader title="First" />
          <PageHeader title="Second" />
        </>,
      );

      await user.click(screen.getByText("Show success"));

      const message = screen.getByText("Test success");
      const second = screen.getByRole("heading", { name: "Second" });
      expect(screen.getAllByText("Test success")).toHaveLength(1);
      // Under the first header, so before the second.
      expect(
        second.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_PRECEDING,
      ).toBeTruthy();
    });

    it("goes back above the page when the header is taken away", async () => {
      const user = userEvent.setup();
      const { rerender } = renderPage(<PageHeader title="Edit user" />);
      await user.click(screen.getByText("Show success"));

      rerender(
        <PageMessageProvider>
          <div data-testid="above-page">
            <PageMessageDisplay fallback />
          </div>
          <TestConsumer />
        </PageMessageProvider>,
      );

      expect(screen.getByTestId("above-page")).toHaveTextContent("Test success");
    });
  });

  describe("usePageMessage hook", () => {
    it("throws when used outside provider", () => {
      // Suppress console.error for expected error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderWithMantine(<TestConsumer />);
      }).toThrow("usePageMessage must be used within PageMessageProvider");

      consoleSpy.mockRestore();
    });
  });
});
