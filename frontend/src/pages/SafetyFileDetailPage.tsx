import { Box, Group, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { ApiError } from "../api/client";
import type { Mitigation, SafetyFileDetail } from "../api/types";
import { PDFDownload } from "../components/PDFDownload";
import AddButton from "../components/button/AddButton";
import { IconAlertCircle } from "../components/icons/appIcons";
import { PageSpinner } from "../components/loading-spinner";
import { StateMessage } from "../components/message-cards";
import AuditTrailTable from "../components/safety/AuditTrailTable";
import HazardTable from "../components/safety/HazardTable";
import { CellLines, DataTable } from "../components/tables";
import type { Column } from "../components/tables/DataTable";
import { BodyText, Heading, PageHeader, TextLink } from "../components/typography";
import { documentPath, getFile, isNotFound } from "../lib/safety";

const NOT_FOUND = "That safety file does not exist, or you do not have access to it.";

/** The mitigation columns, linking each to its own page. */
function mitigationColumns(slug: string): Column<Mitigation>[] {
  return [
    // Fixed widths for the short words, so "MIT-001" and "implemented" each
    // stay on one line rather than breaking at a hyphen or mid-word.
    {
      header: "ID",
      render: (mitigation) => mitigation.id,
      accessor: (m) => m.id,
      width: "7.5rem",
    },
    {
      header: "Mitigation",
      render: (mitigation) => (
        <TextLink to={`/safety-files/${slug}/mitigations/${mitigation.id}`}>
          {mitigation.title}
        </TextLink>
      ),
      accessor: (mitigation) => mitigation.title,
    },
    { header: "Status", render: (m) => m.status, accessor: (m) => m.status, width: "10rem" },
    {
      header: "Control type",
      render: (m) => m.control_type,
      accessor: (m) => m.control_type,
      width: "10rem",
    },
    {
      header: "Hazards",
      // One to a line, so a reference never breaks at its hyphen.
      render: (mitigation) => <CellLines lines={mitigation.hazards} empty="Not linked" />,
    },
  ];
}

export function SafetyFileDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [detail, setDetail] = useState<SafetyFileDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getFile(slug ?? "", controller.signal)
      .then(setDetail)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (isNotFound(reason)) setError(NOT_FOUND);
        else setError(reason instanceof ApiError ? reason.message : "Something went wrong.");
      });

    return () => controller.abort();
  }, [slug]);

  if (error) {
    return (
      <Stack>
        <PageHeader title="Safety file" />
        <Box role="alert">
          <StateMessage
            icon={<IconAlertCircle />}
            colour="alert"
            title="Could not load that safety file"
            description={error}
          />
        </Box>
      </Stack>
    );
  }
  if (detail === null) return <PageSpinner label="Loading the safety file" />;

  return <SafetyFile detail={detail} />;
}

function SafetyFile({ detail }: { detail: SafetyFileDetail }) {
  const navigate = useNavigate();
  const file = detail.safety_file;

  return (
    <Stack gap="lg">
      <PageHeader
        title={file.name}
        subtitle={`${file.standard_display} · ${file.organisation}`}
      />

      <Stack gap="xs">
        <BodyText>
          {detail.team
            ? `Recorded accountable CSO: ${detail.team.accountable.name} (${detail.team.accountable.email})`
            : `Owner-controlled file: ${file.owner_name}`}
        </BodyText>
        {detail.team && (
          <BodyText>
            {detail.team.organisation_name} · {detail.team.collaborators.length} named CSO
            collaborators. Appointments are not professional verification.
          </BodyText>
        )}
        {detail.can_manage_team && (
          <TextLink to={`/safety-files/${file.slug}/team`} standalone>
            {detail.team ? "Manage file team" : "Adopt into an organisation / name a file team"}
          </TextLink>
        )}
        <TextLink to="/safety-files" standalone>
          All safety files
        </TextLink>
      </Stack>

      {detail.repository_missing ? (
        <Box role="alert">
          <StateMessage
            icon={<IconAlertCircle />}
            colour="alert"
            title="The repository is not on disk"
            description={
              <>
                Turva expected to find it at <code>{detail.repository_path}</code>. The
                repository is the record and the database is only an index, so this is
                recoverable but needs a person: restore the repository from backup, then run{" "}
                <code>manage.py reindex_safety_files</code>. Do not delete this entry - it is
                the evidence that the safety file existed.
              </>
            }
          />
        </Box>
      ) : (
        <Stack gap="lg">
          {detail.head_sha && file.standard === "DCB0160" && (
            <PDFDownload key={detail.head_sha} slug={file.slug} head={detail.head_sha} />
          )}

          {detail.problems && detail.problems.length > 0 && (
            <Box role="alert">
              <StateMessage
                icon={<IconAlertCircle />}
                colour="alert"
                title="This safety file does not validate"
                description={
                  <ul>
                    {detail.problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                }
              />
            </Box>
          )}

          {detail.blocking && detail.blocking.length > 0 && (
            <Box role="alert">
              <StateMessage
                icon={<IconAlertCircle />}
                colour="alert"
                title="Residual risk requires elimination before go-live"
                description={`${detail.blocking.join(", ")} ${detail.blocking.length === 1 ? "has" : "have"} a derived residual risk level of 4 or 5 and ${detail.blocking.length === 1 ? "is" : "are"} still open.`}
              />
            </Box>
          )}

          {detail.documents && detail.documents.length > 0 && (
            <Stack component="section" aria-label="Safety documents" gap="xs">
              <Heading>Safety documents</Heading>
              <BodyText c="dimmed">Read-only views of the committed documents.</BodyText>
              {detail.documents.map((item) => (
                <TextLink key={item.key} to={documentPath(file.slug, item.key)} standalone>
                  {item.title}
                </TextLink>
              ))}
            </Stack>
          )}

          <Stack gap="xs">
            <Heading>Hazards</Heading>
            <HazardTable
              hazards={detail.hazards ?? []}
              caption="Hazards recorded in this safety file"
              emptyMessage="No hazards recorded yet. An empty hazard log is not evidence of a safe system. It means hazard identification has not been done."
              onSelect={(hazard) =>
                void navigate(`/safety-files/${file.slug}/hazards/${hazard.id}`)
              }
              action={
                detail.can_edit ? (
                  <AddButton
                    label="Record hazard"
                    onClick={() => void navigate(`/safety-files/${file.slug}/hazards/new`)}
                  />
                ) : undefined
              }
            />
            <BodyText c="dimmed">
              Risk level is derived from severity and likelihood by the storage layer. It is
              never entered.
            </BodyText>
          </Stack>

          <Stack gap="xs" id="mitigations">
            <Heading>Mitigations</Heading>
            {detail.can_edit && (
              <Group justify="flex-end">
                <AddButton
                  label="Record mitigation"
                  onClick={() => void navigate(`/safety-files/${file.slug}/mitigations/new`)}
                />
              </Group>
            )}
            <DataTable<Mitigation>
              data={detail.mitigations ?? []}
              columns={mitigationColumns(file.slug)}
              getRowKey={(mitigation) => mitigation.id}
              caption="Mitigations and their linked hazards"
              emptyMessage="No mitigations recorded yet."
            />
          </Stack>

          <Stack gap="xs">
            <Heading>Audit trail</Heading>
            <BodyText c="dimmed">
              Every change is a commit attributed to the person who made it. This is the record
              a regulator or a court would examine.
            </BodyText>
            <AuditTrailTable
              history={detail.history ?? []}
              caption="The ten most recent changes"
            />
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
