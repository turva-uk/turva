import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithMantine } from "@/test/test-utils";
import { SAMPLE_PROCESS } from "@/test/safetyFile";
import NextStepCard from "./NextStepCard";

describe("NextStepCard", () => {
  it("names the next step, where it is, and what is outstanding", () => {
    renderWithMantine(<NextStepCard process={SAMPLE_PROCESS} onOpenGuide={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        name: "The next step is: Hold a hazard workshop",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 4, 2 done")).toBeInTheDocument();
    expect(screen.getByText("no hazard workshop has been recorded")).toBeInTheDocument();
  });

  it("never says the deployment is safe", () => {
    renderWithMantine(<NextStepCard process={SAMPLE_PROCESS} onOpenGuide={vi.fn()} />);

    expect(screen.getByText(/not that the deployment is safe/)).toBeInTheDocument();
  });

  it("opens the step's guidance", async () => {
    const onOpenGuide = vi.fn<(stepId: string) => void>();
    renderWithMantine(<NextStepCard process={SAMPLE_PROCESS} onOpenGuide={onOpenGuide} />);

    await userEvent.click(screen.getByRole("button", { name: "Read the guidance" }));

    expect(onOpenGuide).toHaveBeenCalledWith("hold-a-hazard-workshop");
  });

  it("says only that the process is complete when every step is done", () => {
    renderWithMantine(
      <NextStepCard
        process={{
          next_step: null,
          steps: SAMPLE_PROCESS.steps.map((step) => ({
            ...step,
            done: true,
            reasons: [],
          })),
        }}
        onOpenGuide={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Every step of the process is complete",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/judgement of the people/)).toBeInTheDocument();
  });

  it("shows the step's own action", () => {
    renderWithMantine(
      <NextStepCard
        process={SAMPLE_PROCESS}
        onOpenGuide={vi.fn()}
        action={<button type="button">Record workshop</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Record workshop" })).toBeInTheDocument();
  });
});
