/**
 * MultiStepForm Component
 *
 * Splits a long form into steps, with a numbered stepper across the top,
 * each step's fields in a card, and Back and Next beneath. On a phone the
 * step labels are left out and a line reads "Step 2 of 3: Registration".
 *
 * - Next runs the step's `validate` first, and stays put if it fails
 * - A step already visited can be opened from the stepper, and with
 *   `allStepsAccessible`, every step can, such as when editing
 * - A step's `actions` replace Back and Next for that step, so the last
 *   step of a shared `Form` can use `SubmitButton`
 *
 * It keeps no form state itself. Wrap the whole thing in one `Form`, so
 * every step's values are sent together.
 *
 * @example
 * ```tsx
 * <MultiStepForm
 *   steps={[
 *     { label: "Identity", content: () => <IdentityFields /> },
 *     { label: "Declaration", content: () => <DeclarationFields />, actions: ({ prevStep }) => <SubmitButton onCancel={prevStep} cancelLabel="Back" /> },
 *   ]}
 *   onCancel={() => navigate("/settings")}
 * />
 * ```
 */

import { Stack, Stepper, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useState, type ReactNode } from "react";

import { BaseCard } from "@/components/base-card";
import ButtonPair from "@/components/button/ButtonPair";
import Icon from "@/components/icons/Icon";
import { IconCheck } from "@/components/icons/appIcons";
import BodyText from "@/components/typography/BodyText";
import classes from "./MultiStepForm.module.css";

/** One step. */
export interface StepConfig {
  /** The step's name, in the stepper */
  label: string;
  /** The step's content */
  content: (props: StepContentProps) => ReactNode;
  /** Checked before Next moves on; false stays on this step */
  validate?: () => boolean | Promise<boolean>;
  /** Next's words on this step, "Next" by default, or "Submit" on the last */
  nextButtonLabel?: string;
  /** The cancel button's words, "Cancel" on the first step and "Back" after */
  cancelButtonLabel?: string;
  /** Buttons to show in place of Back and Next on this step */
  actions?: (props: StepContentProps) => ReactNode;
}

/** What a step's content and actions can call. */
export interface StepContentProps {
  /** Check this step, then move to the next */
  nextStep: () => Promise<void>;
  /** Move to the step before */
  prevStep: () => void;
  /** Leave the form */
  onCancel: () => void;
}

export interface MultiStepFormProps {
  /** The steps, in order */
  steps: readonly StepConfig[];
  /** Called by Cancel on the first step */
  onCancel: () => void;
  /** Called by the last step's button, when it has no `actions` */
  onSubmit?: () => void;
  /** The open step, counting from 0, when the page holds it */
  activeStep?: number;
  /** Called when the open step changes, when the page holds it */
  onStepChange?: (step: number) => void;
  /** Every step can be opened from the stepper, not only those visited */
  allStepsAccessible?: boolean;
}

export default function MultiStepForm({
  steps,
  onCancel,
  onSubmit,
  activeStep: controlledStep,
  onStepChange,
  allStepsAccessible = false,
}: MultiStepFormProps) {
  const [internalStep, setInternalStep] = useState(0);
  const [highestVisitedStep, setHighestVisitedStep] = useState(controlledStep ?? 0);
  const theme = useMantineTheme();
  const isNarrow = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const activeStep = controlledStep ?? internalStep;
  const setActiveStep = onStepChange ?? setInternalStep;

  if (activeStep > highestVisitedStep) {
    setHighestVisitedStep(activeStep);
  }

  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;
  const current = steps[activeStep];

  if (!current) return null;

  async function nextStep() {
    if (current?.validate && !(await current.validate())) return;

    if (!isLastStep) {
      setHighestVisitedStep((highest) => Math.max(highest, activeStep + 1));
      setActiveStep(activeStep + 1);
    }
  }

  function prevStep() {
    if (!isFirstStep) setActiveStep(activeStep - 1);
  }

  function openStep(index: number) {
    if (allStepsAccessible || index <= highestVisitedStep) setActiveStep(index);
  }

  const stepProps: StepContentProps = { nextStep, prevStep, onCancel };
  const acceptLabel = current.nextButtonLabel ?? (isLastStep ? "Submit" : "Next");

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Stepper
          active={activeStep}
          onStepClick={openStep}
          completedIcon={
            <Icon
              icon={<IconCheck stroke={3} />}
              size="sm"
              colour="var(--mantine-color-secondary-4)"
            />
          }
          classNames={{
            root: classes.root,
            stepIcon: classes.stepIcon,
            stepLabel: classes.stepLabel,
            separator: classes.separator,
            step: isNarrow ? classes.stepNarrow : classes.stepWide,
          }}
          size="sm"
        >
          {steps.map((step, index) => (
            <Stepper.Step
              key={step.label}
              // A circle with no label beside it still needs a name.
              {...(isNarrow ? { "aria-label": step.label } : { label: step.label })}
              allowStepSelect={allStepsAccessible || index <= highestVisitedStep}
            />
          ))}
        </Stepper>

        {isNarrow && (
          <BodyText>
            Step {activeStep + 1} of {steps.length}: {current.label}
          </BodyText>
        )}
      </Stack>

      <BaseCard>{current.content(stepProps)}</BaseCard>

      {current.actions ? (
        current.actions(stepProps)
      ) : (
        <ButtonPair
          mt="xl"
          cancelLabel={current.cancelButtonLabel ?? (isFirstStep ? "Cancel" : "Back")}
          onCancel={isFirstStep ? onCancel : prevStep}
          acceptLabel={acceptLabel}
          onAccept={isLastStep ? (onSubmit ?? onCancel) : () => void nextStep()}
        />
      )}
    </Stack>
  );
}
