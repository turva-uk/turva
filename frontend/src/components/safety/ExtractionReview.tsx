/**
 * ExtractionReview Component
 *
 * A supplier's hazard table beside the hazards it would become, for an
 * officer to check before anything is written. Each row shows the cells
 * as the supplier's document has them on one side and the drafted hazard
 * on the other, with the risk level the server derives for it, so a
 * dropped or garbled field is visible rather than hidden in a summary.
 *
 * **The column map is the officer's to change.** One select per field
 * says which of the supplier's columns feeds it, or none. A row the
 * parser could not read says why, and stays out unless the map is
 * changed; a row that is not a hazard at all, such as a note, is ticked
 * off. Nothing is guessed.
 *
 * Every hazard imported is still marked extracted, to be reviewed one by
 * one; this screen decides only what goes in.
 *
 * Not yet in Turva's API: supplier extraction has no route, so this
 * takes everything as props. The level for each row comes from
 * `previewAssessment`, as `HazardForm`'s does, never from a matrix in the
 * browser (TH-008).
 *
 * @example
 * ```tsx
 * <ExtractionReview
 *   extraction={extraction}
 *   rejected={rejected}
 *   onToggleRow={toggle}
 *   onColumnMapChange={remap}
 * />
 * ```
 */

import { Badge, Checkbox, Select, SimpleGrid, Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import { badgeColours, BADGE_VARIANT } from "@/components/badge/badgeColours";
import { BodyText, BodyTextBold, FieldDescription, Heading } from "@/components/typography";
import RiskScoreBadge from "./RiskScoreBadge";
import {
  EXTRACTION_FIELDS,
  isRiskScore,
  previewAssessment as askTheServer,
  type ColumnMap,
  type Extraction,
  type ExtractionField,
  type ExtractionRow,
  type RiskScore,
} from "@/lib/safety";
import { useAssessmentPreview, type PreviewAssessment } from "./useAssessmentPreview";

const FIELD_LABELS: Record<ExtractionField, string> = {
  supplier_id: "Supplier's reference",
  title: "Hazard name",
  cause: "Cause",
  effect: "Effect",
  harm: "Potential harm",
  controls: "Supplier's controls",
  severity: "Severity",
  likelihood: "Likelihood",
};

export interface ExtractionReviewProps {
  /** The table as read, and the map it was read with */
  extraction: Extraction;
  /**
   * Asks the server for a row's level. Defaults to `previewAssessment`
   * in `@/lib/safety`; stories and tests pass a stand-in.
   */
  previewAssessment?: PreviewAssessment;
  /** Rows the officer has ticked off as not hazards */
  rejected: ReadonlySet<number>;
  /** Called when a row is ticked or unticked */
  onToggleRow: (row: number) => void;
  /** Called with the whole map when one field's column changes */
  onColumnMapChange: (columnMap: ColumnMap) => void;
  /** Disables the controls while a request is in flight */
  disabled?: boolean;
}

function scoreOf(value: number | null): RiskScore | null {
  return value !== null && isRiskScore(value) ? value : null;
}

/** The level the server gives the row's scores, once it has answered. */
function RowLevel({ row, preview }: { row: ExtractionRow; preview: PreviewAssessment }) {
  const level = useAssessmentPreview(scoreOf(row.severity), scoreOf(row.likelihood), preview);

  if (level.state === "ready") return <RiskScoreBadge assessment={level.assessment} />;
  if (level.state === "failed") {
    return (
      <FieldDescription>Turva could not work out the risk level just now.</FieldDescription>
    );
  }

  return null;
}

function ColumnMapEditor({
  extraction,
  onColumnMapChange,
  disabled,
}: Pick<ExtractionReviewProps, "extraction" | "onColumnMapChange" | "disabled">) {
  const options = [
    { value: "", label: "None" },
    ...extraction.headers.map((header, index) => ({
      value: String(index),
      label: header || `Column ${index + 1}`,
    })),
  ];

  return (
    <BaseCard>
      <Stack gap="md">
        <Heading>Which column is which</Heading>
        <FieldDescription>
          Suggested from the table&apos;s header row. Change any that are wrong; a field set to
          none is left empty.
        </FieldDescription>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {EXTRACTION_FIELDS.map((field) => (
            <Select
              key={field}
              label={FIELD_LABELS[field]}
              data={options}
              value={
                extraction.column_map[field] === null
                  ? ""
                  : String(extraction.column_map[field])
              }
              allowDeselect={false}
              disabled={disabled}
              onChange={(value) =>
                onColumnMapChange({
                  ...extraction.column_map,
                  [field]: value ? Number(value) : null,
                })
              }
            />
          ))}
        </SimpleGrid>
      </Stack>
    </BaseCard>
  );
}

function RowReview({
  row,
  headers,
  preview,
  rejected,
  onToggleRow,
  disabled,
}: {
  row: ExtractionRow;
  headers: string[];
  preview: PreviewAssessment;
  rejected: boolean;
  onToggleRow: (row: number) => void;
  disabled?: boolean;
}) {
  return (
    <BaseCard data-testid={`extraction-row-${row.row}`}>
      <Stack gap="md">
        <Checkbox
          label={`Row ${row.row} is not a hazard: leave it out`}
          checked={rejected}
          disabled={disabled}
          onChange={() => onToggleRow(row.row)}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Stack gap="xs">
            <BodyTextBold>In the supplier&apos;s document</BodyTextBold>
            {row.cells.map((cell, index) => (
              <BodyText key={index}>
                <strong>{headers[index] || `Column ${index + 1}`}:</strong> {cell || "(empty)"}
              </BodyText>
            ))}
          </Stack>
          <Stack gap="xs">
            <BodyTextBold>{rejected ? "Left out" : "Drafted hazard"}</BodyTextBold>
            {!rejected && (
              <>
                <BodyText>{row.title || "(no hazard name)"}</BodyText>
                {row.supplier_id && (
                  <FieldDescription>
                    Supplier&apos;s reference: {row.supplier_id}
                  </FieldDescription>
                )}
                {row.cause && <BodyText>Cause: {row.cause}</BodyText>}
                <RowLevel row={row} preview={preview} />
                {row.problems.map((problem) => (
                  <Badge
                    key={problem}
                    color={badgeColours.alert.bg}
                    c={badgeColours.alert.text}
                    variant={BADGE_VARIANT}
                  >
                    Cannot read: {problem}
                  </Badge>
                ))}
              </>
            )}
          </Stack>
        </SimpleGrid>
      </Stack>
    </BaseCard>
  );
}

export default function ExtractionReview({
  extraction,
  previewAssessment = askTheServer,
  rejected,
  onToggleRow,
  onColumnMapChange,
  disabled = false,
}: ExtractionReviewProps) {
  return (
    <Stack gap="lg">
      <ColumnMapEditor
        extraction={extraction}
        onColumnMapChange={onColumnMapChange}
        disabled={disabled}
      />
      {extraction.rows.map((row) => (
        <RowReview
          key={row.row}
          row={row}
          headers={extraction.headers}
          preview={previewAssessment}
          rejected={rejected.has(row.row)}
          onToggleRow={onToggleRow}
          disabled={disabled}
        />
      ))}
    </Stack>
  );
}
