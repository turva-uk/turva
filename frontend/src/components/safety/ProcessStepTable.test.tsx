import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import { SAMPLE_PROCESS } from "@/test/safetyFile";
import ProcessStepTable from "./ProcessStepTable";

describe("ProcessStepTable", () => {
  it("lists every step in order with its state", () => {
    renderWithRouter(<ProcessStepTable steps={SAMPLE_PROCESS.steps} />);

    expect(screen.getAllByText("Done")).toHaveLength(2);
    expect(screen.getAllByText("Not yet")).toHaveLength(2);
    expect(screen.getByText("no hazard workshop has been recorded")).toBeInTheDocument();
  });

  it("opens a step when it is chosen", async () => {
    const onSelect = vi.fn<(stepId: string) => void>();
    renderWithRouter(<ProcessStepTable steps={SAMPLE_PROCESS.steps} onSelect={onSelect} />);

    await userEvent.click(screen.getByText("Hold a hazard workshop"));

    expect(onSelect).toHaveBeenCalledWith("hold-a-hazard-workshop");
  });

  it("says when the template has no process", () => {
    renderWithRouter(<ProcessStepTable steps={[]} />);

    expect(screen.getByText("This file's template has no process.")).toBeInTheDocument();
  });
});
