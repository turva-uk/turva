import { Box, Stack } from "@mantine/core";
import { useRef } from "react";
import { useNavigate } from "react-router";

import { useSession } from "../auth/useSession";
import { EMAIL_PATTERN, EmailField, PasswordField, TextField } from "../components/form";
import { Form, FormStatus, SubmitButton, useFormContext } from "../components/form/Form";
import type { FormSubmitResult } from "../components/form/Form";
import { BodyText, PageHeader, TextLink } from "../components/typography";
import { apiFailure } from "../lib/forms";

type RegistrationValues = {
  email: string;
  first_name: string;
  last_name: string;
  organisation: string;
  password: string;
  confirm_password: string;
};

const FIELDS = ["email", "first_name", "last_name", "organisation", "password"] as const;

function RegistrationFields() {
  const { methods } = useFormContext<RegistrationValues>();
  const { errors } = methods.formState;

  return (
    <>
      <EmailField
        label="Email address"
        autoComplete="username"
        required
        {...methods.register("email", {
          required: "Enter your email address",
          pattern: EMAIL_PATTERN,
        })}
        error={errors.email?.message}
      />
      <TextField
        label="First name"
        autoComplete="given-name"
        required
        maxLength={50}
        {...methods.register("first_name", { required: "Enter your first name" })}
        error={errors.first_name?.message}
      />
      <TextField
        label="Last name"
        autoComplete="family-name"
        required
        maxLength={50}
        {...methods.register("last_name", { required: "Enter your last name" })}
        error={errors.last_name?.message}
      />
      <TextField
        label="Organisation"
        autoComplete="organization"
        maxLength={100}
        {...methods.register("organisation")}
        error={errors.organisation?.message}
      />
      <PasswordField
        label="Password"
        autoComplete="new-password"
        required
        description="Use at least eight characters. Avoid common, entirely numeric passwords or one similar to your name or email."
        {...methods.register("password", { required: "Choose a password" })}
        error={errors.password?.message}
      />
      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        required
        {...methods.register("confirm_password", {
          required: "Type the password again",
          validate: (value, values) =>
            value === values.password || "The passwords do not match.",
        })}
        error={errors.confirm_password?.message}
      />
    </>
  );
}

export function RegistrationPage() {
  const { register, user } = useSession();
  const navigate = useNavigate();
  // Whether the confirmation email went, for the next page to say so.
  const emailSent = useRef(false);

  if (user) {
    return (
      <Box maw={560} mx="auto">
        <Stack>
          <PageHeader title="You are already signed in" />
          <BodyText>Sign out to create another account.</BodyText>
          <TextLink to={user.is_verified ? "/safety-files" : "/verify-email"} standalone>
            Open your account
          </TextLink>
        </Stack>
      </Box>
    );
  }

  async function submit(
    values: RegistrationValues,
  ): Promise<FormSubmitResult<RegistrationValues>> {
    try {
      emailSent.current = await register({
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        organisation: values.organisation,
        password: values.password,
      });

      return { state: "success", message: { title: "Account created" } };
    } catch (error) {
      return apiFailure<RegistrationValues>(error, "Could not create your account", FIELDS);
    }
  }

  return (
    <Box maw={560} mx="auto">
      <Stack>
        <PageHeader title="Create your account" />
        <BodyText>
          Confirm your email before creating safety files. A CSO declaration is recorded
          separately in your profile.
        </BodyText>

        <Form<RegistrationValues>
          defaultValues={{
            email: "",
            first_name: "",
            last_name: "",
            organisation: "",
            password: "",
            confirm_password: "",
          }}
          onSubmit={submit}
          onSuccess={() =>
            void navigate("/verify-email", { state: { emailSent: emailSent.current } })
          }
          submitLabel="Create account"
          submittingLabel="Creating account…"
        >
          <Stack>
            <FormStatus retainsDraft />
            <RegistrationFields />
            <SubmitButton />
          </Stack>
        </Form>

        <TextLink to="/login" standalone>
          Already have an account? Sign in
        </TextLink>
      </Stack>
    </Box>
  );
}
