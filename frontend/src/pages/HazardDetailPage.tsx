import { Box, Group, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { ApiError } from "../api/client";
import type { HazardDetail as HazardDetailData, HazardOptions } from "../api/types";
import IconTextButton from "../components/button/IconTextButton";
import SecondaryButton from "../components/button/SecondaryButton";
import { IconAlertCircle } from "../components/icons/appIcons";
import { PageSpinner } from "../components/loading-spinner";
import { StateMessage } from "../components/message-cards";
import AuditTrailTable from "../components/safety/AuditTrailTable";
import HazardDetail from "../components/safety/HazardDetail";
import { BodyText, Heading, PageHeader, TextLink } from "../components/typography";
import { getHazard, hazardOptions, isNotFound } from "../lib/safety";

const NOT_FOUND = "That hazard does not exist, or you do not have access to it.";

export function HazardDetailPage() {
  const { slug = "", hazardId = "" } = useParams();
  const [data, setData] = useState<HazardDetailData | null>(null);
  const [options, setOptions] = useState<HazardOptions | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getHazard(slug, hazardId, controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (isNotFound(reason)) setError(NOT_FOUND);
        else setError(reason instanceof ApiError ? reason.message : "Something went wrong.");
      });
    // The scores' words. Without them each score shows as its number, so a
    // failure here does not stop the hazard showing.
    hazardOptions(controller.signal)
      .then(setOptions)
      .catch(() => undefined);

    return () => controller.abort();
  }, [slug, hazardId]);

  if (error) {
    return (
      <Stack maw={960}>
        <PageHeader title="Hazard" />
        <Box role="alert">
          <StateMessage
            icon={<IconAlertCircle />}
            colour="alert"
            title="Could not load that hazard"
            description={error}
          />
        </Box>
      </Stack>
    );
  }
  if (!data) return <PageSpinner label="Loading the hazard" />;

  return <Hazard data={data} options={options} slug={slug} />;
}

function Hazard({
  data,
  options,
  slug,
}: {
  data: HazardDetailData;
  options: HazardOptions | undefined;
  slug: string;
}) {
  const navigate = useNavigate();
  const { hazard, safety_file: file } = data;

  return (
    <Box maw={960}>
      <Stack gap="lg">
        <TextLink to={`/safety-files/${slug}`} standalone>
          Back to {file.name}
        </TextLink>
        <PageHeader
          title={`${hazard.id}: ${hazard.title}`}
          action={
            data.can_edit ? (
              <IconTextButton
                icon="pencil"
                label="Edit hazard"
                onClick={() => void navigate(`/safety-files/${slug}/hazards/${hazard.id}/edit`)}
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

        <HazardDetail
          hazard={hazard}
          mitigations={data.mitigations}
          options={options}
          showTitle={false}
          mitigationHref={(id) => `/safety-files/${slug}/mitigations/${id}`}
          mitigationAction={
            data.can_edit ? (
              <Group justify="flex-end">
                <SecondaryButton
                  onClick={() =>
                    void navigate(`/safety-files/${slug}/mitigations/new?hazard=${hazard.id}`)
                  }
                >
                  Record a mitigation for this hazard
                </SecondaryButton>
              </Group>
            ) : undefined
          }
        />

        <Stack gap="xs">
          <Heading>Hazard history</Heading>
          <AuditTrailTable
            history={data.history}
            caption="Up to 50 most recent changes to this hazard, including renames"
          />
        </Stack>

        <BodyText c="dimmed">
          Repository version: <code>{data.head_sha}</code>. This is recorded evidence, not
          confirmation that the system is safe.
        </BodyText>
      </Stack>
    </Box>
  );
}
