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
import { Link, useNavigate } from "react-router";

import { useSubmission } from "../api/useSubmission";
import { useSession } from "../auth/useSession";
import { SaveFailure } from "../components/SaveFailure";

export function RegistrationPage() {
  const { register, user } = useSession();
  const navigate = useNavigate();
  const { run, submitting, failure } = useSubmission();
  const form = useForm({
    initialValues: {
      email: "",
      first_name: "",
      last_name: "",
      organisation: "",
      password: "",
      confirm_password: "",
    },
    validate: {
      confirm_password: (value, values) =>
        value === values.password ? null : "The passwords do not match.",
    },
  });
  if (user)
    return (
      <Alert title="You are already signed in">
        <Anchor component={Link} to={user.is_verified ? "/safety-files" : "/verify-email"}>
          Open your account
        </Anchor>{" "}
        or sign out to create another account.
      </Alert>
    );
  return (
    <Box maw={560} mx="auto">
      <Title order={1} size="h2" mb="sm">
        Create your account
      </Title>
      <Text mb="md">
        Confirm your email before creating safety files. A CSO declaration is recorded
        separately in your profile.
      </Text>
      <SaveFailure message={failure} />
      <form
        noValidate
        onSubmit={form.onSubmit((values) =>
          run(async () => {
            const sent = await register({
              email: values.email,
              first_name: values.first_name,
              last_name: values.last_name,
              organisation: values.organisation,
              password: values.password,
            });
            void navigate("/verify-email", { state: { emailSent: sent } });
          }, form.setErrors),
        )}
      >
        <Stack>
          <TextInput
            label="Email address"
            type="email"
            autoComplete="username"
            required
            {...form.getInputProps("email")}
          />
          <TextInput
            label="First name"
            autoComplete="given-name"
            required
            maxLength={50}
            {...form.getInputProps("first_name")}
          />
          <TextInput
            label="Last name"
            autoComplete="family-name"
            required
            maxLength={50}
            {...form.getInputProps("last_name")}
          />
          <TextInput
            label="Organisation"
            autoComplete="organization"
            maxLength={100}
            {...form.getInputProps("organisation")}
          />
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            required
            description="Use at least eight characters. Avoid common, entirely numeric passwords or one similar to your name or email."
            {...form.getInputProps("password")}
          />
          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            required
            {...form.getInputProps("confirm_password")}
          />
          <Button type="submit" loading={submitting}>
            Create account
          </Button>
          <Anchor component={Link} to="/login">
            Already have an account? Sign in
          </Anchor>
        </Stack>
      </form>
    </Box>
  );
}
