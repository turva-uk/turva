import { Box, Fieldset, Stack } from "@mantine/core";
import { Controller } from "react-hook-form";

import { api } from "../api/client";
import type { User } from "../api/types";
import { useApiResource } from "../api/useApiResource";
import { useSession } from "../auth/useSession";
import { CheckboxField, SelectField, TextField } from "../components/form";
import { Form, FormStatus, SubmitButton, useFormContext } from "../components/form/Form";
import type { FormSubmitResult } from "../components/form/Form";
import { IconAlertCircle } from "../components/icons/appIcons";
import { PageSpinner } from "../components/loading-spinner";
import { StateMessage } from "../components/message-cards";
import { BodyText, BodyTextInline, PageHeader, TextLink } from "../components/typography";
import { apiFailure } from "../lib/forms";

interface ProfileOptions {
  regulators: { value: string; label: string }[];
  cso_criteria: string;
}

type ProfileValues = {
  first_name: string;
  last_name: string;
  organisation: string;
  job_role: string;
  professional_regulator: string;
  registration_number: string;
  is_cso: boolean;
  confirm_cso_criteria: boolean;
};

const FIELDS = [
  "first_name",
  "last_name",
  "organisation",
  "job_role",
  "professional_regulator",
  "registration_number",
  "is_cso",
  "confirm_cso_criteria",
] as const;

export function ProfilePage() {
  const { user } = useSession();
  const { data, error } = useApiResource<ProfileOptions>("/profile/options/");

  if (error) {
    return (
      <Box maw={720}>
        <Stack>
          <PageHeader title="Your profile" />
          <Box role="alert">
            <StateMessage
              icon={<IconAlertCircle />}
              colour="alert"
              title="Could not load your profile"
              description={error}
            />
          </Box>
        </Stack>
      </Box>
    );
  }
  if (!data || !user) return <PageSpinner label="Loading your profile" />;

  return <ProfileForm user={user} options={data} />;
}

function ProfileFields({ user, options }: { user: User; options: ProfileOptions }) {
  const { methods } = useFormContext<ProfileValues>();
  const { errors } = methods.formState;
  const isCso = methods.watch("is_cso");

  return (
    <Stack gap="lg">
      <Fieldset legend="Identity">
        <Stack>
          <TextField
            label="First name"
            required
            maxLength={50}
            autoComplete="given-name"
            {...methods.register("first_name", { required: "Enter your first name" })}
            error={errors.first_name?.message}
          />
          <TextField
            label="Last name"
            required
            maxLength={50}
            autoComplete="family-name"
            {...methods.register("last_name", { required: "Enter your last name" })}
            error={errors.last_name?.message}
          />
          <TextField
            label="Organisation"
            maxLength={100}
            autoComplete="organization"
            {...methods.register("organisation")}
            error={errors.organisation?.message}
          />
          <TextField
            label="Job role"
            maxLength={100}
            autoComplete="organization-title"
            {...methods.register("job_role")}
            error={errors.job_role?.message}
          />
        </Stack>
      </Fieldset>

      <Fieldset legend="Professional registration">
        <Stack>
          <Controller
            control={methods.control}
            name="professional_regulator"
            render={({ field }) => (
              <SelectField
                label="Professional regulator"
                placeholder="No regulator recorded"
                data={options.regulators}
                value={field.value || null}
                onChange={(value) => field.onChange(value ?? "")}
                onBlur={field.onBlur}
                error={errors.professional_regulator?.message}
              />
            )}
          />
          <TextField
            label="Registration number"
            description="As it appears on your regulator’s public register."
            maxLength={40}
            autoComplete="off"
            {...methods.register("registration_number")}
            error={errors.registration_number?.message}
          />
          <BodyText>
            {user.registration_verified
              ? "Registration manually checked. Changing your name or registration clears that check."
              : "Not verified by Turva. Turva cannot confirm a registration against the public register."}
          </BodyText>
        </Stack>
      </Fieldset>

      <Fieldset legend="Clinical Safety Officer declaration">
        <Stack>
          <CheckboxField
            label="I act as a Clinical Safety Officer"
            description="Turva records this declaration; it does not confer the role. A professional regulator and registration number are required."
            {...methods.register("is_cso")}
            error={errors.is_cso?.message}
          />
          {isCso && (
            <CheckboxField
              label="I meet the criteria for a Clinical Safety Officer"
              description={options.cso_criteria}
              {...methods.register("confirm_cso_criteria")}
              error={errors.confirm_cso_criteria?.message}
            />
          )}
          {user.cso_declared_at && (
            <BodyTextInline>
              Self-declared on {new Date(user.cso_declared_at).toLocaleDateString("en-GB")}.
              Unticking the role and saving withdraws the declaration.
            </BodyTextInline>
          )}
        </Stack>
      </Fieldset>
    </Stack>
  );
}

function ProfileForm({ user, options }: { user: User; options: ProfileOptions }) {
  const { refresh } = useSession();

  async function save(values: ProfileValues): Promise<FormSubmitResult<ProfileValues>> {
    try {
      await api.patch<User>("/profile/", values);
      await refresh();

      return {
        state: "success",
        message: {
          title: "Profile saved",
          description:
            "Your details have been saved. A CSO declaration is self-declared; Turva does not confer the role or check the public register.",
        },
      };
    } catch (error) {
      return apiFailure<ProfileValues>(error, "Profile not saved", FIELDS);
    }
  }

  return (
    <Box maw={720}>
      <Stack>
        <PageHeader title="Your profile" />
        <BodyText>
          Your name and registration are copied into new safety files. Saving here does not
          rewrite existing safety evidence.
        </BodyText>
        <BodyText>
          Signed in as {user.email}. Email changes require a separate confirmation process and
          are not available here.
        </BodyText>

        <Form<ProfileValues>
          defaultValues={{
            first_name: user.first_name,
            last_name: user.last_name,
            organisation: user.organisation,
            job_role: user.job_role,
            professional_regulator: user.professional_regulator,
            registration_number: user.registration_number,
            is_cso: user.is_cso,
            confirm_cso_criteria: user.is_cso,
          }}
          onSubmit={save}
          submitLabel="Save profile"
          submittingLabel="Saving…"
        >
          <Stack gap="lg">
            <FormStatus retainsDraft />
            <ProfileFields user={user} options={options} />
            <SubmitButton />
          </Stack>
        </Form>

        <TextLink to="/safety-files" standalone>
          Back to your safety files
        </TextLink>
      </Stack>
    </Box>
  );
}
