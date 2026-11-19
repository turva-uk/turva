import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithMantine } from "@/test/test-utils";
import ResultMessage from "./ResultMessage";

describe("ResultMessage", () => {
  it("renders success variant with title", () => {
    renderWithMantine(<ResultMessage variant="success" title="Passed" />);
    expect(screen.getByText("Passed")).toBeInTheDocument();
  });

  it("renders fail variant with title", () => {
    renderWithMantine(<ResultMessage variant="fail" title="Not passed" />);
    expect(screen.getByText("Not passed")).toBeInTheDocument();
  });

  it("renders warning variant with title", () => {
    renderWithMantine(<ResultMessage variant="warning" title="Incomplete" />);
    expect(screen.getByText("Incomplete")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    renderWithMantine(<ResultMessage variant="success" title="Passed" subtitle="Polyp test" />);
    expect(screen.getByText("Polyp test")).toBeInTheDocument();
  });

  it("does not render subtitle when omitted", () => {
    renderWithMantine(<ResultMessage variant="success" title="Passed" />);
    expect(screen.queryByText("Polyp test")).not.toBeInTheDocument();
  });

  it("renders as a card element", () => {
    renderWithMantine(<ResultMessage variant="success" title="Passed" />);
    expect(screen.getByTestId("result-message")).toBeInTheDocument();
  });

  it("shows icon for success", () => {
    const { container } = renderWithMantine(<ResultMessage variant="success" title="Passed" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows icon for fail", () => {
    const { container } = renderWithMantine(<ResultMessage variant="fail" title="Failed" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows icon for warning", () => {
    const { container } = renderWithMantine(
      <ResultMessage variant="warning" title="Incomplete" />,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
