import { Box, Stack } from "@mantine/core";
import { useState } from "react";
import { useParams } from "react-router";

import { api } from "../api/client";
import { useSession } from "../auth/useSession";
import { EMAIL_PATTERN, EmailField, PasswordField } from "../components/form";
import {
  Form,
  FormStatus,
  FormStatusNarrow,
  SubmitButton,
  useFormContext,
} from "../components/form/Form";
import type { FormSubmitResult } from "../components/form/Form";
import { BodyText, PageHeader, TextLink } from "../components/typography";
import { apiFailure } from "../lib/forms";

type ResetRequestValues = { email: string };

function ResetRequestFields() {
  const { methods } = useFormContext<ResetRequestValues>();
  const { errors } = methods.formState;

  return (
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
  );
}

export function PasswordResetRequestPage() {
  // The server's reply says the same whether or not an account exists, so
  // it is shown as it came and the form goes.
  const [reply, setReply] = useState("");

  async function submit(
    values: ResetRequestValues,
  ): Promise<FormSubmitResult<ResetRequestValues>> {
    try {
      const response = await api.post<{ detail: string }>("/auth/password-reset/", values);
      setReply(response.detail);

      return {
        state: "success",
        message: { title: "Request sent", description: response.detail },
      };
    } catch (error) {
      return apiFailure<ResetRequestValues>(error, "Could not request a reset", ["email"]);
    }
  }

  return (
    <Box maw={560} mx="auto">
      <Stack>
        <PageHeader title="Reset your password" />

        {reply ? (
          <FormStatus variant="success" title="Request sent" description={reply} />
        ) : (
          <Form<ResetRequestValues>
            defaultValues={{ email: "" }}
            onSubmit={submit}
            submitLabel="Request password reset"
            submittingLabel="Requesting…"
          >
            <Stack>
              <FormStatusNarrow retainsDraft />
              <BodyText>
                Enter your account email address. We will not confirm whether an account exists.
              </BodyText>
              <ResetRequestFields />
              <SubmitButton />
            </Stack>
          </Form>
        )}

        <TextLink to="/login" standalone>
          Back to sign in
        </TextLink>
      </Stack>
    </Box>
  );
}

type NewPasswordValues = { new_password1: string; new_password2: string };

function NewPasswordFields() {
  const { methods } = useFormContext<NewPasswordValues>();
  const { errors } = methods.formState;

  return (
    <>
      <PasswordField
        label="New password"
        autoComplete="new-password"
        required
        description="Use at least eight characters. Avoid common passwords or one similar to your name or email."
        {...methods.register("new_password1", { required: "Choose a new password" })}
        error={errors.new_password1?.message}
      />
      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        required
        {...methods.register("new_password2", {
          required: "Type the new password again",
          validate: (value, values) =>
            value === values.new_password1 || "The passwords do not match.",
        })}
        error={errors.new_password2?.message}
      />
    </>
  );
}

export function PasswordResetConfirmPage() {
  const { uid, token } = useParams();
  const { refresh } = useSession();
  const [complete, setComplete] = useState(false);

  async function submit(
    values: NewPasswordValues,
  ): Promise<FormSubmitResult<NewPasswordValues>> {
    try {
      await api.post("/auth/password-reset/confirm/", { ...values, uid, token });
      await refresh();
      setComplete(true);

      return { state: "success", message: { title: "Password changed" } };
    } catch (error) {
      return apiFailure<NewPasswordValues>(error, "Could not change your password", [
        "new_password1",
        "new_password2",
      ]);
    }
  }

  return (
    <Box maw={560} mx="auto">
      <Stack>
        <PageHeader title="Choose a new password" />

        {complete ? (
          <Stack>
            <FormStatus
              variant="success"
              title="Password changed"
              description="Your previous sessions will no longer work."
            />
            <TextLink to="/login" standalone>
              Sign in with your new password
            </TextLink>
          </Stack>
        ) : (
          <Form<NewPasswordValues>
            defaultValues={{ new_password1: "", new_password2: "" }}
            onSubmit={submit}
            submitLabel="Change password"
            submittingLabel="Changing password…"
          >
            <Stack>
              <FormStatusNarrow retainsDraft />
              <NewPasswordFields />
              <SubmitButton />
              <TextLink to="/password-reset" standalone>
                Request a new reset link
              </TextLink>
            </Stack>
          </Form>
        )}
      </Stack>
    </Box>
  );
}
