import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import FeatureBadge from "./FeatureBadge";

describe("FeatureBadge", () => {
  describe("Rendering", () => {
    it("displays the label text", () => {
      renderWithMantine(<FeatureBadge label="Teaching" />);
      expect(screen.getByText("Teaching")).toBeInTheDocument();
    });

    it("renders as a badge element", () => {
      const { container } = renderWithMantine(<FeatureBadge label="Messaging" />);
      const badge = container.querySelector(".mantine-Badge-root");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Size prop", () => {
    it("renders with default size", () => {
      const { container } = renderWithMantine(<FeatureBadge label="Teaching" />);
      const badge = container.querySelector(".mantine-Badge-root");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("renders skeleton when loading", () => {
      const { container } = renderWithMantine(<FeatureBadge label="Teaching" isLoading />);
      const skeleton = container.querySelector(".mantine-Skeleton-root");
      expect(skeleton).toBeInTheDocument();
    });

    it("does not render badge text when loading", () => {
      renderWithMantine(<FeatureBadge label="Teaching" isLoading />);
      expect(screen.queryByText("Teaching")).not.toBeInTheDocument();
    });
  });
});
