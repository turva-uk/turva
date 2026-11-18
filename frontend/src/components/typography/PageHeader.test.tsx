import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import PageHeader from "./PageHeader";

describe("PageHeader", () => {
  it("renders title", () => {
    renderWithMantine(<PageHeader title="Test Page" />);
    expect(screen.getByText("Test Page")).toBeInTheDocument();
  });

  it("renders as an h1 element", () => {
    renderWithMantine(<PageHeader title="Test" />);
    expect(screen.getByText("Test").tagName).toBe("H1");
  });

  it("can keep the h1 for screen readers without showing it", () => {
    renderWithMantine(<PageHeader title="Hazard log" visuallyHidden />);
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Hazard log",
    });
    expect(heading.closest(".mantine-VisuallyHidden-root")).not.toBeNull();
  });

  describe("with a subtitle", () => {
    it("shows the subtitle grouped with the h1, not as a heading", () => {
      renderWithMantine(<PageHeader title="Dr Jane Smith" subtitle="At Oncology" />);
      const subtitle = screen.getByText("At Oncology");
      const heading = screen.getByRole("heading", { level: 1 });
      expect(subtitle.tagName).toBe("P");
      expect(subtitle.closest("hgroup")).toBe(heading.closest("hgroup"));
      expect(subtitle.closest("hgroup")).not.toBeNull();
      expect(screen.getAllByRole("heading")).toHaveLength(1);
    });

    it("keeps the subtitle out of the document title", () => {
      renderWithMantine(<PageHeader title="Dr Jane Smith" subtitle="At Oncology" />);
      expect(document.title).not.toContain("At Oncology");
    });

    it("renders no hgroup without a subtitle", () => {
      const { container } = renderWithMantine(<PageHeader title="Users" />);
      expect(container.querySelector("hgroup")).toBeNull();
    });

    it("hides the subtitle along with a hidden title", () => {
      renderWithMantine(
        <PageHeader title="Hazard log" subtitle="At Oncology" visuallyHidden />,
      );
      expect(
        screen.getByText("At Oncology").closest(".mantine-VisuallyHidden-root"),
      ).not.toBeNull();
    });
  });

  describe("with an action", () => {
    it("shows the action beside the title", () => {
      renderWithMantine(<PageHeader title="Users" action={<button>Add user</button>} />);

      expect(screen.getByRole("heading", { level: 1, name: "Users" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add user" })).toBeInTheDocument();
    });

    it("puts the title and the action in one row", () => {
      renderWithMantine(<PageHeader title="Users" action={<button>Add user</button>} />);

      // The action's wrapper and the heading share a parent: the row that
      // keeps the action on the right when it wraps.
      const row = screen.getByRole("heading", { level: 1 }).parentElement;
      expect(row).toContainElement(screen.getByRole("button", { name: "Add user" }));
      expect(row).toHaveAttribute("data-align", "end");
    });

    it("can centre the action against the title", () => {
      renderWithMantine(
        <PageHeader
          title="Administration"
          action={<span>Superadmin</span>}
          actionAlign="center"
        />,
      );

      const row = screen.getByRole("heading", { level: 1 }).parentElement;
      expect(row).toHaveAttribute("data-align", "center");
    });

    it("keeps a hidden title hidden, and still shows the action", () => {
      renderWithMantine(
        <PageHeader title="Hazard log" visuallyHidden action={<button>Edit</button>} />,
      );

      const heading = screen.getByRole("heading", {
        level: 1,
        name: "Hazard log",
      });
      expect(heading.closest(".mantine-VisuallyHidden-root")).not.toBeNull();
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });

    it("renders no row without an action", () => {
      renderWithMantine(<PageHeader title="Users" />);

      expect(screen.getByRole("heading", { level: 1 }).parentElement).not.toHaveAttribute(
        "data-align",
      );
    });
  });
});
