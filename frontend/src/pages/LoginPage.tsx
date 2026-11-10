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
import { Link, useNavigate } from "react-router";

import { ApiError } from "../api/client";
import { useSession } from "../auth/useSession";

export function LoginPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Enter a valid email address"),
      password: (value) => (value.length > 0 ? null : "Enter your password"),
    },
  });

  const submit = form.onSubmit(async ({ email, password }) => {
    setFailure(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      void navigate("/safety-files");
    } catch (error) {
      // Shown rather than swallowed. A sign-in that fails silently leaves
      // someone retyping a correct password.
      setFailure(
        error instanceof ApiError
          ? error.message
          : "Something went wrong signing you in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Box maw={420} mx="auto" mt="xl">
      <Title order={1} size="h2" mb="md">
        Sign in
      </Title>

      {failure && (
        <Alert color="red" mb="md" role="alert" title="Could not sign you in">
          {failure}
        </Alert>
      )}

      <form onSubmit={submit} noValidate>
        <Stack>
          <TextInput
            label="Email address"
            type="email"
            autoComplete="username"
            autoFocus
            {...form.getInputProps("email")}
          />
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            {...form.getInputProps("password")}
          />
          <Button type="submit" loading={submitting} fullWidth>
            Sign in
          </Button>
        </Stack>
      </form>

      <Stack gap="xs" mt="md">
        <Anchor component={Link} to="/register">
          Create an account
        </Anchor>
        <Anchor component={Link} to="/password-reset">
          Forgot your password?
        </Anchor>
      </Stack>

      <Text size="sm" c="dimmed" mt="lg">
        Turva manages clinical safety evidence. It does not make clinical decisions and does not
        replace a Clinical Safety Officer.
      </Text>
    </Box>
  );
}
