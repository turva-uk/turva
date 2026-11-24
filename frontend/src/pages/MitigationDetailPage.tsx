import { Box, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { ApiError } from "../api/client";
import type { MitigationDetail as MitigationDetailData } from "../api/types";
import IconTextButton from "../components/button/IconTextButton";
import { IconAlertCircle } from "../components/icons/appIcons";
import { PageSpinner } from "../components/loading-spinner";
import { StateMessage } from "../components/message-cards";
import AuditTrailTable from "../components/safety/AuditTrailTable";
import MitigationDetail from "../components/safety/MitigationDetail";
import { BodyText, Heading, PageHeader, TextLink } from "../components/typography";
import { getMitigation, isNotFound } from "../lib/safety";

const NOT_FOUND = "That mitigation does not exist, or you do not have access to it.";

export function MitigationDetailPage() {
  const { slug = "", mitigationId = "" } = useParams();
  const [data, setData] = useState<MitigationDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getMitigation(slug, mitigationId, controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (isNotFound(reason)) setError(NOT_FOUND);
        else setError(reason instanceof ApiError ? reason.message : "Something went wrong.");
      });

    return () => controller.abort();
  }, [slug, mitigationId]);

  if (error) {
    return (
      <Stack maw={960}>
        <PageHeader title="Mitigation" />
        <Box role="alert">
          <StateMessage
            icon={<IconAlertCircle />}
            colour="alert"
            title="Could not load that mitigation"
            description={error}
          />
        </Box>
      </Stack>
    );
  }
  if (!data) return <PageSpinner label="Loading the mitigation" />;

  return <Mitigation data={data} slug={slug} />;
}

function Mitigation({ data, slug }: { data: MitigationDetailData; slug: string }) {
  const navigate = useNavigate();
  const { mitigation, safety_file: file } = data;

  return (
    <Box maw={960}>
      <Stack gap="lg">
        <TextLink to={`/safety-files/${slug}`} standalone>
          Back to {file.name}
        </TextLink>
        <PageHeader
          title={`${mitigation.id}: ${mitigation.title}`}
          action={
            data.can_edit ? (
              <IconTextButton
                icon="pencil"
                label="Edit mitigation"
                onClick={() =>
                  void navigate(`/safety-files/${slug}/mitigations/${mitigation.id}/edit`)
                }
              />
            ) : undefined
          }
        />

        {data.problems.length > 0 && (
          <Box role="alert">
            <StateMessage
              icon={<IconAlertCircle />}
              colour="alert"
              title="This safety file does not validate"
              description={
                <ul>
                  {data.problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              }
            />
          </Box>
        )}

        <MitigationDetail
          mitigation={mitigation}
          hazards={data.hazards}
          showTitle={false}
          hazardHref={(id) => `/safety-files/${slug}/hazards/${id}`}
        />

        <Stack gap="xs">
          <Heading>Mitigation history</Heading>
          <AuditTrailTable
            history={data.history}
            caption="Up to 50 most recent changes to this mitigation, including renames and links"
          />
        </Stack>

        <BodyText c="dimmed">
          Repository version: <code>{data.head_sha}</code>. This is recorded evidence, not
          approval to deploy.
        </BodyText>
      </Stack>
    </Box>
  );
}
