import { Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { ApiError } from "../api/client";
import type { SafetyFile } from "../api/types";
import AddButton from "../components/button/AddButton";
import SafetyCaseTable from "../components/safety/SafetyCaseTable";
import { BodyText, PageHeader } from "../components/typography";
import { listFiles } from "../lib/safety";

export function SafetyFilesPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<SafetyFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    listFiles(controller.signal)
      .then(setFiles)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof ApiError ? reason.message : "Something went wrong. Try again.",
        );
      });

    return () => controller.abort();
  }, []);

  return (
    <Stack>
      <PageHeader
        title="Your safety files"
        action={
          <AddButton
            label="Create safety file"
            onClick={() => void navigate("/safety-files/new")}
          />
        }
      />

      <SafetyCaseTable
        cases={files ?? []}
        loading={files === null && error === null}
        error={error ? `Could not load your safety files. ${error}` : null}
        label="Safety files"
        emptyMessage="You have no safety files yet."
        onSelect={(file) => void navigate(`/safety-files/${file.slug}`)}
      />

      {files?.length === 0 && (
        <BodyText c="dimmed">
          A safety file is a Git repository holding the hazards, risk assessments, mitigations
          and safety case for one system. Turva creates and commits to it for you; you never
          need to use Git.
        </BodyText>
      )}
    </Stack>
  );
}
