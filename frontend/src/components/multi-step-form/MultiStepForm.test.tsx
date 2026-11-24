import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithMantine } from "@/test/test-utils";
import BodyText from "@/components/typography/BodyText";
import MultiStepForm from "./MultiStepForm";
import type { StepConfig } from "./MultiStepForm";

const steps: StepConfig[] = [
  { label: "Identity", content: () => <BodyText>Identity fields</BodyText> },
  { label: "Registration", content: () => <BodyText>Registration fields</BodyText> },
  {
    label: "Declaration",
    nextButtonLabel: "Save profile",
    content: () => <BodyText>Declaration fields</BodyText>,
  },
];

function phone() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("MultiStepForm", () => {
  it("opens on the first step, with Cancel and Next", () => {
    renderWithMantine(<MultiStepForm steps={steps} onCancel={vi.fn()} />);

    expect(screen.getByText("Identity fields")).toBeInTheDocument();
    expect(screen.queryByText("Registration fields")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("moves on with Next and back with Back", async () => {
    const actor = userEvent.setup();
    renderWithMantine(<MultiStepForm steps={steps} onCancel={vi.fn()} />);

    await actor.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Registration fields")).toBeInTheDocument();

    await actor.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Identity fields")).toBeInTheDocument();
  });

  it("stays on a step whose check fails", async () => {
    const actor = userEvent.setup();
    const failing: StepConfig[] = [{ ...steps[0]!, validate: () => false }, steps[1]!];
    renderWithMantine(<MultiStepForm steps={failing} onCancel={vi.fn()} />);

    await actor.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Identity fields")).toBeInTheDocument();
  });

  it("calls onCancel from the first step", async () => {
    const onCancel = vi.fn();
    renderWithMantine(<MultiStepForm steps={steps} onCancel={onCancel} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("names the last step's button and calls onSubmit", async () => {
    const onSubmit = vi.fn();
    renderWithMantine(
      <MultiStepForm steps={steps} onCancel={vi.fn()} onSubmit={onSubmit} activeStep={2} />,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Save profile" }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("shows a step's own actions in place of Back and Next", () => {
    const withActions: StepConfig[] = [
      { ...steps[0]!, actions: ({ prevStep }) => <button onClick={prevStep}>Save now</button> },
    ];
    renderWithMantine(<MultiStepForm steps={withActions} onCancel={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Save now" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("opens only visited steps from the stepper, unless every step is open", async () => {
    const actor = userEvent.setup();
    const { unmount } = renderWithMantine(<MultiStepForm steps={steps} onCancel={vi.fn()} />);

    await actor.click(screen.getByRole("button", { name: /Declaration/ }));
    expect(screen.getByText("Identity fields")).toBeInTheDocument();
    unmount();

    renderWithMantine(<MultiStepForm steps={steps} onCancel={vi.fn()} allStepsAccessible />);
    await actor.click(screen.getByRole("button", { name: /Declaration/ }));
    expect(screen.getByText("Declaration fields")).toBeInTheDocument();
  });

  it("reports the step to the page when the page holds it", async () => {
    const onStepChange = vi.fn();
    renderWithMantine(
      <MultiStepForm
        steps={steps}
        onCancel={vi.fn()}
        activeStep={0}
        onStepChange={onStepChange}
      />,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Next" }));

    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it("names the open step in a line on a phone, and keeps each circle named", () => {
    phone();
    renderWithMantine(
      <MultiStepForm steps={steps} onCancel={vi.fn()} activeStep={1} allStepsAccessible />,
    );

    expect(screen.getByText("Step 2 of 3: Registration")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Declaration" })).toBeInTheDocument();
  });
});
