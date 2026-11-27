/**
 * FieldsetCard Component
 *
 * A card that groups related controls under a name, such as one person's
 * role checkboxes on an organisation's page. It looks like any other
 * `BaseCard`, with the name as a bold title inside it.
 *
 * Underneath it is a real fieldset, drawn invisibly. The fieldset is what
 * tells a screen reader that the controls belong together and whose they
 * are: "Dr Anita Patel, group", then her checkboxes. Mantine's own boxed
 * `Fieldset` draws a grey box with the name on its top border, which
 * ignores Turva's card colours, so use this instead.
 *
 * @example
 * ```tsx
 * <FieldsetCard legend="Dr Anita Patel" description="a.patel@riverbank.example.nhs.uk">
 *   <CheckboxField label="Organisation administrator" />
 * </FieldsetCard>
 * ```
 */

import { Box, Fieldset, Stack } from "@mantine/core";
import { useId, type ReactNode } from "react";

import { BodyTextInline, FieldDescription } from "@/components/typography";
import BaseCard from "./BaseCard";

export interface FieldsetCardProps {
  /** The group's name, shown as the card's title and read out as the group's label */
  legend: string;
  /** A quieter line under the title, read out as the group's description */
  description?: ReactNode;
  /** The controls in the group */
  children: ReactNode;
}

export default function FieldsetCard({ legend, description, children }: FieldsetCardProps) {
  const descriptionId = useId();

  return (
    <BaseCard data-testid="fieldset-card">
      <Fieldset
        variant="unstyled"
        legend={<BodyTextInline bold>{legend}</BodyTextInline>}
        aria-describedby={description ? descriptionId : undefined}
      >
        <Stack gap="sm">
          {description && (
            <Box id={descriptionId}>
              <FieldDescription>{description}</FieldDescription>
            </Box>
          )}
          {children}
        </Stack>
      </Fieldset>
    </BaseCard>
  );
}
