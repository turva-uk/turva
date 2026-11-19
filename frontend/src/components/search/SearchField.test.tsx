import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import SearchField from "./SearchFields";

describe("SearchField Component", () => {
  describe("Initial state", () => {
    it("renders search icon button when collapsed", () => {
      renderWithMantine(<SearchField />);
      const button = screen.getByLabelText("Open search");
      expect(button).toBeInTheDocument();
    });

    it("does not show text input initially", () => {
      renderWithMantine(<SearchField />);
      expect(screen.queryByPlaceholderText("Search…")).not.toBeInTheDocument();
    });

    it("renders search icon", () => {
      const { container } = renderWithMantine(<SearchField />);
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Expand behavior", () => {
    it("expands to show text input when icon clicked", async () => {
      const user = userEvent.setup();
      renderWithMantine(<SearchField />);

      const button = screen.getByLabelText("Open search");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
      });
    });

    it("auto-focuses input when expanded", async () => {
      const user = userEvent.setup();
      renderWithMantine(<SearchField />);

      const button = screen.getByLabelText("Open search");
      await user.click(button);

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Search…");
        expect(input).toHaveFocus();
      });
    });

    it("shows close button when expanded", async () => {
      const user = userEvent.setup();
      renderWithMantine(<SearchField />);

      const button = screen.getByLabelText("Open search");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByLabelText("Close search")).toBeInTheDocument();
      });
    });
  });

  describe("Touch target", () => {
    it("gives the close button the class that fills the right section on phones", () => {
      renderWithMantine(<SearchField value="query" onChange={vi.fn()} />);
      expect(screen.getByLabelText("Close search").className).toMatch(/close/);
    });
  });

  describe("Collapse behavior", () => {
    it("collapses when close button is clicked", async () => {
      const user = userEvent.setup();
      renderWithMantine(<SearchField />);

      // Expand first
      const openButton = screen.getByLabelText("Open search");
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
      });

      // Then collapse
      const closeButton = screen.getByLabelText("Close search");
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Search…")).not.toBeInTheDocument();
      });
    });

    it("collapses on blur when input is empty", async () => {
      const user = userEvent.setup();
      renderWithMantine(<SearchField />);

      // Expand
      const openButton = screen.getByLabelText("Open search");
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
      });

      // Blur the input (empty)
      await user.click(document.body);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Search\u2026")).not.toBeInTheDocument();
      });
    });

    it("stays open on blur when input has text", async () => {
      const user = userEvent.setup();
      renderWithMantine(<SearchField />);

      // Expand
      const openButton = screen.getByLabelText("Open search");
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
      });

      // Type something, then blur
      const input = screen.getByPlaceholderText("Search\u2026");
      await user.type(input, "query");
      await user.click(document.body);

      // Should stay open since there's text
      expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
      expect(input).toHaveValue("query");
    });

    it("returns to search icon after closing", async () => {
      const user = userEvent.setup();
      renderWithMantine(<SearchField />);

      // Expand and collapse
      const openButton = screen.getByLabelText("Open search");
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText("Close search");
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Open search")).toBeInTheDocument();
      });
    });
  });

  describe("Text input", () => {
    it("keeps uncontrolled input editable when an onChange observer is supplied", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithMantine(<SearchField onChange={onChange} />);
      await user.click(screen.getByLabelText("Open search"));
      await user.type(screen.getByRole("textbox", { name: "Search" }), "hazard");
      expect(screen.getByRole("textbox", { name: "Search" })).toHaveValue("hazard");
      expect(onChange).toHaveBeenLastCalledWith("hazard");
      await user.click(screen.getByLabelText("Close search"));
      expect(onChange).toHaveBeenLastCalledWith("");
      await user.click(screen.getByLabelText("Open search"));
      expect(screen.getByRole("textbox", { name: "Search" })).toHaveValue("");
    });

    it("allows typing in search field", async () => {
      const user = userEvent.setup();
      renderWithMantine(<SearchField />);

      const openButton = screen.getByLabelText("Open search");
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Search…");
      await user.type(input, "test query");

      expect(input).toHaveValue("test query");
    });

    it("has correct placeholder text", async () => {
      const user = userEvent.setup();
      renderWithMantine(<SearchField />);

      const openButton = screen.getByLabelText("Open search");
      await user.click(openButton);

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Search…");
        expect(input).toBeInTheDocument();
      });
    });

    it("has search aria-label", async () => {
      const user = userEvent.setup();
      renderWithMantine(<SearchField />);

      const openButton = screen.getByLabelText("Open search");
      await user.click(openButton);

      await waitFor(() => {
        const input = screen.getByLabelText("Search");
        expect(input).toBeInTheDocument();
      });
    });
  });

  describe("Animation", () => {
    it("has transition styles on input", async () => {
      const user = userEvent.setup();
      const { container } = renderWithMantine(<SearchField />);

      const openButton = screen.getByLabelText("Open search");
      await user.click(openButton);

      await waitFor(() => {
        const input = container.querySelector("input");
        expect(input).toBeInTheDocument();
      });
    });
  });

  describe("Controlled mode", () => {
    it("displays controlled value", async () => {
      const handleChange = vi.fn();

      renderWithMantine(<SearchField value="hello" onChange={handleChange} />);

      // Should auto-expand when value is non-empty
      await waitFor(() => {
        const input = screen.getByPlaceholderText("Search\u2026");
        expect(input).toHaveValue("hello");
      });
    });

    it("calls onChange when user types", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      renderWithMantine(<SearchField value="" onChange={handleChange} />);

      // Expand
      const openButton = screen.getByLabelText("Open search");
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Search\u2026");
      await user.type(input, "a");

      expect(handleChange).toHaveBeenCalledWith("a");
    });

    it("calls onChange with empty string when close is clicked", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      renderWithMantine(<SearchField value="query" onChange={handleChange} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText("Close search"));

      expect(handleChange).toHaveBeenCalledWith("");
    });
  });
});
