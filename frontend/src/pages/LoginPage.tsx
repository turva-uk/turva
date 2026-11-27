import { Stack } from "@mantine/core";
import { useNavigate } from "react-router";

import { useSession } from "../auth/useSession";
import { EMAIL_PATTERN, EmailField, PasswordField } from "../components/form";
import { Form, FormStatusNarrow, SubmitButton, useFormContext } from "../components/form/Form";
import type { FormSubmitResult } from "../components/form/Form";
import { BodyText, PageHeader, TextLink } from "../components/typography";
import { WelcomeLayout } from "../components/layouts";
import { apiFailure } from "../lib/forms";

type SignInValues = { email: string; password: string };

const FIELDS = ["email", "password"] as const;

function SignInFields() {
  const { methods } = useFormContext<SignInValues>();
  const { errors } = methods.formState;

  return (
    <>
      <EmailField
        label="Email address"
        autoComplete="username"
        autoFocus
        {...methods.register("email", {
          required: "Enter a valid email address",
          pattern: { value: EMAIL_PATTERN.value, message: "Enter a valid email address" },
        })}
        error={errors.email?.message}
      />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        {...methods.register("password", { required: "Enter your password" })}
        error={errors.password?.message}
      />
    </>
  );
}

export function LoginPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();

  async function submit({
    email,
    password,
  }: SignInValues): Promise<FormSubmitResult<SignInValues>> {
    try {
      await signIn(email, password);

      return { state: "success", message: { title: "Signed in" } };
    } catch (error) {
      // Shown rather than swallowed. A sign-in that fails silently leaves
      // someone retyping a correct password.
      return apiFailure<SignInValues>(error, "Could not sign you in", FIELDS);
    }
  }

  return (
    <WelcomeLayout>
      <Stack>
        <PageHeader title="Sign in" />

        <Form<SignInValues>
          defaultValues={{ email: "", password: "" }}
          onSubmit={submit}
          onSuccess={() => void navigate("/safety-files")}
          submitLabel="Sign in"
          submittingLabel="Signing in…"
          blockNavigation={false}
        >
          <Stack>
            <FormStatusNarrow />
            <SignInFields />
            <SubmitButton />
          </Stack>
        </Form>

        <Stack gap="xs">
          <TextLink to="/register" standalone>
            Create an account
          </TextLink>
          <TextLink to="/password-reset" standalone>
            Forgot your password?
          </TextLink>
        </Stack>

        <BodyText c="dimmed">
          Turva manages clinical safety evidence. It does not make clinical decisions and does
          not replace a Clinical Safety Officer.
        </BodyText>
      </Stack>
    </WelcomeLayout>
  );
}
