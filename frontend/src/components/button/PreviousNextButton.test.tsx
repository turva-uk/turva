/**
 * PreviousNextButton Component Tests
 */

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import PreviousNextButton from "./PreviousNextButton";

describe("PreviousNextButton", () => {
  describe("Rendering", () => {
    it("renders Next button with default label", () => {
      renderWithMantine(<PreviousNextButton onNext={() => {}} />);

      expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    });

    it("renders Previous button when onPrevious is provided", () => {
      renderWithMantine(<PreviousNextButton onPrevious={() => {}} onNext={() => {}} />);

      expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    });

    it("hides Previous button when onPrevious is not provided", () => {
      renderWithMantine(<PreviousNextButton onNext={() => {}} />);

      expect(screen.queryByRole("button", { name: "Previous" })).toBeNull();
    });

    it("renders custom next label", () => {
      renderWithMantine(<PreviousNextButton onNext={() => {}} nextLabel="Submit & finish" />);

      expect(screen.getByRole("button", { name: "Submit & finish" })).toBeInTheDocument();
    });

    it("renders Next before Previous in DOM order", () => {
      renderWithMantine(<PreviousNextButton onPrevious={() => {}} onNext={() => {}} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveTextContent("Next");
      expect(buttons[1]).toHaveTextContent("Previous");
    });
  });

  describe("Interactions", () => {
    it("calls onNext when clicked", async () => {
      const handleNext = vi.fn();
      const user = userEvent.setup();

      renderWithMantine(<PreviousNextButton onNext={handleNext} />);

      await user.click(screen.getByRole("button", { name: "Next" }));
      expect(handleNext).toHaveBeenCalledTimes(1);
    });

    it("calls onPrevious when clicked", async () => {
      const handlePrevious = vi.fn();
      const user = userEvent.setup();

      renderWithMantine(<PreviousNextButton onPrevious={handlePrevious} onNext={() => {}} />);

      await user.click(screen.getByRole("button", { name: "Previous" }));
      expect(handlePrevious).toHaveBeenCalledTimes(1);
    });
  });

  describe("Disabled and loading states", () => {
    it("disables the Next button when nextDisabled is true", () => {
      renderWithMantine(<PreviousNextButton onNext={() => {}} nextDisabled />);

      expect(screen.getByRole("button", { name: "Next" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("shows loading state on the Next button", () => {
      renderWithMantine(<PreviousNextButton onNext={() => {}} nextLoading />);

      const button = screen.getByRole("button", { name: "Next" });
      expect(button).toHaveAttribute("data-loading", "true");
    });
  });
});
