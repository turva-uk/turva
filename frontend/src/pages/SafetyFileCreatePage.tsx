import {
  Alert,
  Anchor,
  Box,
  Button,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Link, useNavigate } from "react-router";

import { api } from "../api/client";
import type { SafetyFile } from "../api/types";
import { useSubmission } from "../api/useSubmission";
import { useSession } from "../auth/useSession";
import { SaveFailure } from "../components/SaveFailure";

export function SafetyFileCreatePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { run, submitting, failure } = useSubmission();
  const form = useForm({
    initialValues: {
      name: "",
      standard: "DCB0160",
      organisation: user?.organisation ?? "",
      intended_use: "",
    },
  });

  return (
    <Box maw={720}>
      <Title order={1} size="h2" mb="sm">
        Create a safety file
      </Title>
      <Text mb="md">
        Start a clinical safety management file for one system. The documents start as drafts,
        with unanswered sections marked “To be completed”.
      </Text>
      <Text size="sm" mb="md">
        The first version will be attributed to {user?.full_name || user?.email}.{" "}
        <Anchor component={Link} to="/profile">
          Check your profile and CSO declaration
        </Anchor>{" "}
        before creating it.
      </Text>
      <SaveFailure message={failure} />
      <form
        noValidate
        onSubmit={form.onSubmit((values) =>
          run(async () => {
            const file = await api.post<SafetyFile>("/safety-files/", values);
            void navigate(`/safety-files/${file.slug}`);
          }, form.setErrors),
        )}
      >
        <Stack>
          <TextInput
            label="System name"
            description="For example: BP@Home remote blood pressure monitoring."
            required
            maxLength={200}
            autoComplete="off"
            {...form.getInputProps("name")}
          />
          <NativeSelect
            label="Standard"
            data={[
              { value: "DCB0160", label: "DCB0160 - deploying a system" },
              {
                value: "DCB0129",
                label: "DCB0129 - manufacturing a system (template not yet available)",
              },
            ]}
            {...form.getInputProps("standard")}
          />
          {form.values.standard === "DCB0129" && (
            <Alert color="yellow" role="alert" title="Deployment template only">
              Turva currently starts both standards from the DCB0160 deployment template. This
              is not a DCB0129 document set and needs revision before use.
            </Alert>
          )}
          <TextInput
            label="Organisation"
            description="The organisation accountable for this deployment or product."
            required
            maxLength={200}
            autoComplete="organization"
            {...form.getInputProps("organisation")}
          />
          <Textarea
            label="Intended use"
            description="What the system is for, who uses it, and in what setting. Do not enter patient data."
            required
            minRows={5}
            autosize
            {...form.getInputProps("intended_use")}
          />
          <Text size="sm">
            Saving creates a private repository and its first attributable version. It is not a
            completed safety case or approval to deploy.
          </Text>
          <Button type="submit" loading={submitting} style={{ alignSelf: "flex-start" }}>
            Create safety file
          </Button>
          <Anchor component={Link} to="/safety-files">
            Cancel and return to your safety files
          </Anchor>
        </Stack>
      </form>
    </Box>
  );
}
