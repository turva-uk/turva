/**
 * FormStatus Component
 *
 * Displays submission status at the top of a form.
 * Subscribes to Form context in production, accepts props in Storybook.
 *
 * - Renders nothing in idle/validating/submitting states
 * - Scrolls into view when status changes
 * - Dismissible by the user, never auto-dismissed
 * - Uses role="status" for success, role="alert" for errors
 *
 * @example
 * ```tsx
 * // Inside a <Form> wrapper - no props needed
 * <FormStatus />
 *
 * // In Storybook - prop-driven
 * <FormStatus variant="success" title="Saved" description="Settings updated" />
 * ```
 */

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Box, CloseButton, Group, Stack } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconClock,
} from "@/components/icons/appIcons";
import Icon from "@/components/icons";
import BaseCard from "@/components/base-card/BaseCard";
import { BodyTextInline, Heading } from "@/components/typography";
import { statusColours } from "@/styles/semanticColours";
import { useFormContext } from "./FormContext";

type FormStatusVariant =
  "success" | "partial_success" | "error" | "validation_error" | "timeout";

interface FormStatusPropsFromContext {
  /** When used inside a <Form>, no props needed */
  variant?: never;
  title?: never;
  description?: never;
  onDismiss?: never;
}

interface FormStatusPropsManual {
  /** Visual variant - for Storybook or standalone use */
  variant: FormStatusVariant;
  /** Status title */
  title: string;
  /** Optional description */
  description?: ReactNode;
  /** Called when dismiss button is clicked */
  onDismiss?: () => void;
}

export type FormStatusProps = FormStatusPropsFromContext | FormStatusPropsManual;

const VARIANT_CONFIG: Record<
  FormStatusVariant,
  {
    bg: string;
    icon: React.ReactElement;
    role: "status" | "alert";
    live: "polite" | "assertive";
  }
> = {
  success: {
    bg: statusColours.success.bg,
    icon: <IconCheck />,
    role: "status",
    live: "polite",
  },
  partial_success: {
    bg: statusColours.warning.bg,
    icon: <IconAlertTriangle />,
    role: "status",
    live: "polite",
  },
  error: {
    bg: statusColours.alert.bg,
    icon: <IconAlertCircle />,
    role: "alert",
    live: "assertive",
  },
  timeout: {
    bg: statusColours.warning.bg,
    icon: <IconClock />,
    role: "alert",
    live: "assertive",
  },
  validation_error: {
    bg: statusColours.warning.bg,
    icon: <IconAlertTriangle />,
    role: "alert",
    live: "assertive",
  },
};

function isManualProps(props: FormStatusProps): props is FormStatusPropsManual {
  return "variant" in props && props.variant !== undefined;
}

/** Inner render component - always called with resolved props, hooks safe */
function FormStatusCard({
  variant,
  title,
  description,
  onDismiss,
}: {
  variant: FormStatusVariant;
  title: string;
  description?: ReactNode;
  onDismiss?: () => void;
}) {
  const config = VARIANT_CONFIG[variant];
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // Scroll into view whenever the card appears (mounts) or the message changes
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({
        behavior: reducedMotion ? "instant" : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(id);
  }, [reducedMotion]);

  return (
    <div ref={ref} style={{ scrollMarginTop: 20 }}>
      <BaseCard
        bg={config.bg}
        data-testid="form-status"
        role={config.role}
        aria-live={config.live}
      >
        <Group gap="md" wrap="nowrap" align="flex-start" justify="space-between">
          <Group gap="md" wrap="nowrap" align="flex-start">
            <Box style={{ flexShrink: 0, position: "relative", top: "-0.625rem" }}>
              <Icon icon={config.icon} size="lg" />
            </Box>
            <Stack gap={4}>
              <Heading c="white">{title}</Heading>
              {description && <BodyTextInline c="white">{description}</BodyTextInline>}
            </Stack>
          </Group>
          {onDismiss && (
            <CloseButton
              onClick={onDismiss}
              aria-label="Dismiss"
              c="white"
              variant="transparent"
              style={{ flexShrink: 0 }}
            />
          )}
        </Group>
      </BaseCard>
    </div>
  );
}

/** Context-aware wrapper - reads from Form context */
function FormStatusFromContext() {
  const ctx = useFormContext();

  if (
    ctx.formState === "idle" ||
    ctx.formState === "validating" ||
    ctx.formState === "submitting" ||
    !ctx.statusMessage
  ) {
    return null;
  }

  return (
    <FormStatusCard
      variant={ctx.formState}
      title={ctx.statusMessage.title}
      description={ctx.statusMessage.description}
      onDismiss={ctx.dismissStatus}
    />
  );
}

export default function FormStatus(props: FormStatusProps) {
  if (isManualProps(props)) {
    return (
      <FormStatusCard
        variant={props.variant}
        title={props.title}
        description={props.description}
        onDismiss={props.onDismiss}
      />
    );
  }

  return <FormStatusFromContext />;
}
