import { Box, Stack } from "@mantine/core";
import { useRef } from "react";
import { Controller } from "react-hook-form";
import { useNavigate } from "react-router";

import { useSession } from "../auth/useSession";
import { SelectField, TextAreaField, TextField } from "../components/form";
import { Form, FormStatus, SubmitButton, useFormContext } from "../components/form/Form";
import type { FormSubmitResult } from "../components/form/Form";
import { IconAlertTriangle } from "../components/icons/appIcons";
import { StateMessage } from "../components/message-cards";
import { BodyText, PageHeader, TextLink } from "../components/typography";
import { apiFailure } from "../lib/forms";
import { createFile } from "../lib/safety";
import type { SafetyFileInput } from "../lib/safety";

const FIELDS = ["name", "standard", "organisation", "intended_use"] as const;

const STANDARDS: { value: SafetyFileInput["standard"]; label: string }[] = [
  { value: "DCB0160", label: "DCB0160 - deploying a system" },
  { value: "DCB0129", label: "DCB0129 - manufacturing a system (template not yet available)" },
];

/** Narrow a select's value to one of the two standards. */
function isStandard(value: string | null): value is SafetyFileInput["standard"] {
  return STANDARDS.some((standard) => standard.value === value);
}

function CreateFields() {
  const { methods } = useFormContext<SafetyFileInput>();
  const { errors } = methods.formState;
  const standard = methods.watch("standard");

  return (
    <Stack>
      <TextField
        label="System name"
        description="For example: BP@Home remote blood pressure monitoring."
        required
        maxLength={200}
        autoComplete="off"
        {...methods.register("name", { required: "Enter the system's name" })}
        error={errors.name?.message}
      />
      <Controller
        control={methods.control}
        name="standard"
        render={({ field }) => (
          <SelectField
            label="Standard"
            data={STANDARDS}
            value={field.value}
            allowDeselect={false}
            onChange={(value) => {
              if (isStandard(value)) field.onChange(value);
            }}
            error={errors.standard?.message}
          />
        )}
      />
      {standard === "DCB0129" && (
        <Box role="alert">
          <StateMessage
            icon={<IconAlertTriangle />}
            colour="warning"
            title="Deployment template only"
            description="Turva currently starts both standards from the DCB0160 deployment template. This is not a DCB0129 document set and needs revision before use."
          />
        </Box>
      )}
      <TextField
        label="Organisation"
        description="Recorded organisation name only, not membership or an access grant. After creation, use File team to explicitly adopt the file into a provisioned organisation."
        required
        maxLength={200}
        autoComplete="organization"
        {...methods.register("organisation", { required: "Enter the organisation's name" })}
        error={errors.organisation?.message}
      />
      <TextAreaField
        label="Intended use"
        description="What the system is for, who uses it, and in what setting. Do not enter patient data."
        required
        minRows={5}
        autosize
        {...methods.register("intended_use", { required: "Describe the intended use" })}
        error={errors.intended_use?.message}
      />
      <BodyText>
        Saving creates a private repository and its first attributable version. It is not a
        completed safety case or approval to deploy.
      </BodyText>
      <SubmitButton />
    </Stack>
  );
}

export function SafetyFileCreatePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  // The new file's address, for opening it once the save has succeeded.
  const created = useRef<string | null>(null);

  async function create(values: SafetyFileInput): Promise<FormSubmitResult<SafetyFileInput>> {
    try {
      const file = await createFile(values);
      created.current = file.slug;

      return { state: "success", message: { title: "Safety file created" } };
    } catch (error) {
      return apiFailure<SafetyFileInput>(error, "Could not create the safety file", FIELDS);
    }
  }

  return (
    <Box maw={720}>
      <Stack>
        <PageHeader title="Create a safety file" />
        <BodyText>
          Start a clinical safety management file for one system. The documents start as drafts,
          with unanswered sections marked “To be completed”.
        </BodyText>
        <BodyText>
          The first version will be attributed to {user?.full_name || user?.email}.{" "}
          <TextLink to="/profile">Check your profile and CSO declaration</TextLink> before
          creating it.
        </BodyText>

        <Form<SafetyFileInput>
          defaultValues={{
            name: "",
            standard: "DCB0160",
            organisation: user?.organisation ?? "",
            intended_use: "",
          }}
          onSubmit={create}
          onSuccess={() => {
            if (created.current) void navigate(`/safety-files/${created.current}`);
          }}
          submitLabel="Create safety file"
          submittingLabel="Creating…"
        >
          <Stack>
            <FormStatus retainsDraft />
            <CreateFields />
          </Stack>
        </Form>

        <TextLink to="/safety-files" standalone>
          Cancel and return to your safety files
        </TextLink>
      </Stack>
    </Box>
  );
}
