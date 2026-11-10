import {
  Alert,
  Anchor,
  Box,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { api } from "../api/client";
import { useSubmission } from "../api/useSubmission";
import { useSession } from "../auth/useSession";
import { SaveFailure } from "../components/SaveFailure";

export function PasswordResetRequestPage() {
  const { run, submitting, failure } = useSubmission();
  const [message, setMessage] = useState("");
  const form = useForm({ initialValues: { email: "" } });
  return (
    <Box maw={560} mx="auto">
      <Title order={1} size="h2" mb="md">
        Reset your password
      </Title>
      <SaveFailure message={failure} />
      {message ? (
        <Alert role="status">{message}</Alert>
      ) : (
        <form
          noValidate
          onSubmit={form.onSubmit((values) =>
            run(async () => {
              const response = await api.post<{ detail: string }>(
                "/auth/password-reset/",
                values,
              );
              setMessage(response.detail);
            }, form.setErrors),
          )}
        >
          <Stack>
            <Text>
              Enter your account email address. We will not confirm whether an account exists.
            </Text>
            <TextInput
              label="Email address"
              type="email"
              autoComplete="username"
              required
              {...form.getInputProps("email")}
            />
            <Button type="submit" loading={submitting}>
              Request password reset
            </Button>
          </Stack>
        </form>
      )}
      <Anchor component={Link} to="/login" mt="md" display="block">
        Back to sign in
      </Anchor>
    </Box>
  );
}

export function PasswordResetConfirmPage() {
  const { uid, token } = useParams();
  const { refresh } = useSession();
  const { run, submitting, failure } = useSubmission();
  const [complete, setComplete] = useState(false);
  const form = useForm({
    initialValues: { new_password1: "", new_password2: "" },
    validate: {
      new_password2: (value, values) =>
        value === values.new_password1 ? null : "The passwords do not match.",
    },
  });
  return (
    <Box maw={560} mx="auto">
      <Title order={1} size="h2" mb="md">
        Choose a new password
      </Title>
      <SaveFailure message={failure} />
      {complete ? (
        <Alert role="status" title="Password changed">
          Your previous sessions will no longer work.{" "}
          <Anchor component={Link} to="/login">
            Sign in with your new password
          </Anchor>
          .
        </Alert>
      ) : (
        <form
          noValidate
          onSubmit={form.onSubmit((values) =>
            run(async () => {
              await api.post("/auth/password-reset/confirm/", { ...values, uid, token });
              await refresh();
              setComplete(true);
            }, form.setErrors),
          )}
        >
          <Stack>
            <PasswordInput
              label="New password"
              autoComplete="new-password"
              required
              description="Use at least eight characters. Avoid common passwords or one similar to your name or email."
              {...form.getInputProps("new_password1")}
            />
            <PasswordInput
              label="Confirm new password"
              autoComplete="new-password"
              required
              {...form.getInputProps("new_password2")}
            />
            <Button type="submit" loading={submitting}>
              Change password
            </Button>
            <Anchor component={Link} to="/password-reset">
              Request a new reset link
            </Anchor>
          </Stack>
        </form>
      )}
    </Box>
  );
}
