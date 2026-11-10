import {
  Alert,
  Anchor,
  Box,
  Button,
  Checkbox,
  Fieldset,
  Loader,
  NativeSelect,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link } from "react-router";

import { api } from "../api/client";
import type { User } from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { useSubmission } from "../api/useSubmission";
import { useSession } from "../auth/useSession";
import { SaveFailure } from "../components/SaveFailure";

interface ProfileOptions {
  regulators: { value: string; label: string }[];
  cso_criteria: string;
}

export function ProfilePage() {
  const { user } = useSession();
  const { data, error } = useApiResource<ProfileOptions>("/profile/options/");
  if (error)
    return (
      <Alert color="red" role="alert">
        {error}
      </Alert>
    );
  if (!data || !user) return <Loader aria-label="Loading your profile" />;
  return <ProfileForm user={user} options={data} />;
}

function ProfileForm({ user, options }: { user: User; options: ProfileOptions }) {
  const { refresh } = useSession();
  const { run, submitting, failure } = useSubmission();
  const [saved, setSaved] = useState(false);
  const form = useForm({
    initialValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      organisation: user.organisation,
      job_role: user.job_role,
      professional_regulator: user.professional_regulator,
      registration_number: user.registration_number,
      is_cso: user.is_cso,
      confirm_cso_criteria: user.is_cso,
    },
  });

  return (
    <Box maw={720}>
      <Title order={1} size="h2" mb="sm">
        Your profile
      </Title>
      <Text mb="md">
        Your name and registration are copied into new safety files. Saving here does not
        rewrite existing safety evidence.
      </Text>
      <Text size="sm" mb="lg">
        Signed in as {user.email}. Email changes require a separate confirmation process and are
        not available here.
      </Text>
      <SaveFailure message={failure} />
      {saved && (
        <Alert role="status" title="Profile saved" mb="md">
          Your details have been saved. A CSO declaration is self-declared; Turva does not
          confer the role or check the public register.
        </Alert>
      )}
      <form
        noValidate
        onChange={() => setSaved(false)}
        onSubmit={form.onSubmit((values) => {
          setSaved(false);
          return run(async () => {
            await api.patch<User>("/profile/", values);
            form.resetDirty(values);
            await refresh();
            setSaved(true);
          }, form.setErrors);
        })}
      >
        <Stack gap="lg">
          <Fieldset legend="Identity">
            <Stack>
              <TextInput
                label="First name"
                required
                maxLength={50}
                autoComplete="given-name"
                {...form.getInputProps("first_name")}
              />
              <TextInput
                label="Last name"
                required
                maxLength={50}
                autoComplete="family-name"
                {...form.getInputProps("last_name")}
              />
              <TextInput
                label="Organisation"
                maxLength={100}
                autoComplete="organization"
                {...form.getInputProps("organisation")}
              />
              <TextInput
                label="Job role"
                maxLength={100}
                autoComplete="organization-title"
                {...form.getInputProps("job_role")}
              />
            </Stack>
          </Fieldset>
          <Fieldset legend="Professional registration">
            <Stack>
              <NativeSelect
                label="Professional regulator"
                data={[{ value: "", label: "No regulator recorded" }, ...options.regulators]}
                {...form.getInputProps("professional_regulator")}
              />
              <TextInput
                label="Registration number"
                description="As it appears on your regulator’s public register."
                maxLength={40}
                autoComplete="off"
                {...form.getInputProps("registration_number")}
              />
              <Text size="sm">
                {user.registration_verified
                  ? "Registration manually checked. Changing your name or registration clears that check."
                  : "Not verified by Turva. Turva cannot confirm a registration against the public register."}
              </Text>
            </Stack>
          </Fieldset>
          <Fieldset legend="Clinical Safety Officer declaration">
            <Stack>
              <Checkbox
                label="I act as a Clinical Safety Officer"
                description="Turva records this declaration; it does not confer the role. A professional regulator and registration number are required."
                {...form.getInputProps("is_cso", { type: "checkbox" })}
              />
              {form.values.is_cso && (
                <Checkbox
                  label="I meet the criteria for a Clinical Safety Officer"
                  description={options.cso_criteria}
                  {...form.getInputProps("confirm_cso_criteria", { type: "checkbox" })}
                />
              )}
              {user.cso_declared_at && (
                <Text size="sm">
                  Self-declared on {new Date(user.cso_declared_at).toLocaleDateString("en-GB")}.
                  Unticking the role and saving withdraws the declaration.
                </Text>
              )}
            </Stack>
          </Fieldset>
          <Button type="submit" loading={submitting} style={{ alignSelf: "flex-start" }}>
            Save profile
          </Button>
          <Anchor component={Link} to="/safety-files">
            Back to your safety files
          </Anchor>
        </Stack>
      </form>
    </Box>
  );
}
