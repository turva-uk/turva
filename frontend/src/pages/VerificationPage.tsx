import { Box, Group, Stack } from "@mantine/core";
import { useState } from "react";
import { Navigate, useLocation, useParams } from "react-router";

import { api } from "../api/client";
import { useSession } from "../auth/useSession";
import { SecondaryButton } from "../components/button";
import { Form, FormStatus, SubmitButton } from "../components/form/Form";
import { IconAlertTriangle, IconCheck } from "../components/icons/appIcons";
import { StateMessage } from "../components/message-cards";
import type { FormSubmitResult } from "../components/form/Form";
import { BodyText, PageHeader, TextLink } from "../components/typography";
import { WelcomeLayout } from "../components/layouts";
import { apiFailure } from "../lib/forms";

/** These forms send no fields, only the request itself. */
type NoValues = Record<string, never>;

export function VerificationNoticePage() {
  const { user, refresh } = useSession();
  const location = useLocation();

  if (user?.is_verified) return <Navigate to="/safety-files" replace />;

  async function resend(): Promise<FormSubmitResult<NoValues>> {
    try {
      const response = await api.post<{ detail: string }>("/auth/verify/resend/");

      return {
        state: "success",
        message: { title: "Email sent", description: response.detail },
      };
    } catch (error) {
      return apiFailure<NoValues>(error, "Could not send confirmation", []);
    }
  }

  return (
    <WelcomeLayout>
      <Stack>
        <PageHeader title="Confirm your email address" />
        <BodyText>
          Check the inbox for {user?.email}. Follow the confirmation link before opening or
          creating safety files. You can still edit your profile.
        </BodyText>

        {location.state?.emailSent === false && (
          <Box role="status">
            <StateMessage
              icon={<IconAlertTriangle />}
              colour="warning"
              title="Account created, but email delivery failed"
              description="Your account exists. Please wait ten minutes, then request another confirmation email. Contact an administrator if delivery keeps failing."
            />
          </Box>
        )}
        {location.state?.emailSent === true && (
          <Box role="status">
            <StateMessage
              icon={<IconCheck />}
              colour="success"
              title="A confirmation email was sent"
              description="Follow the link in it to confirm your email address."
            />
          </Box>
        )}

        <Form<NoValues>
          defaultValues={{}}
          onSubmit={resend}
          submitLabel="Resend confirmation email"
          submittingLabel="Sending…"
          blockNavigation={false}
        >
          <Stack>
            <FormStatus />
            <SubmitButton />
          </Stack>
        </Form>

        <BodyText c="dimmed">
          Requests are limited to one every ten minutes. A reused link keeps its original
          eight-hour expiry.
        </BodyText>

        <Group justify="flex-end">
          <SecondaryButton onClick={() => void refresh()}>
            I have confirmed my email - check again
          </SecondaryButton>
        </Group>

        <TextLink to="/settings/profile" standalone>
          Edit your profile
        </TextLink>
      </Stack>
    </WelcomeLayout>
  );
}

export function VerificationConfirmPage() {
  const { userId, token } = useParams();
  const { user, refresh } = useSession();
  const [confirmed, setConfirmed] = useState(false);

  async function confirm(): Promise<FormSubmitResult<NoValues>> {
    try {
      await api.post("/auth/verify/", { user_id: userId, token });
      await refresh();
      setConfirmed(true);

      return { state: "success", message: { title: "Email address confirmed" } };
    } catch (error) {
      return apiFailure<NoValues>(error, "Could not confirm this address", []);
    }
  }

  return (
    <WelcomeLayout>
      <Stack>
        <PageHeader title="Confirm the email address in this link" />

        {confirmed ? (
          <Stack>
            <FormStatus variant="success" title="Email address confirmed" />
            <TextLink to={user ? "/safety-files" : "/login"} standalone>
              {user ? "Open your safety files" : "Sign in"}
            </TextLink>
          </Stack>
        ) : (
          <Form<NoValues>
            defaultValues={{}}
            onSubmit={confirm}
            submitLabel="Confirm email address"
            submittingLabel="Confirming…"
            blockNavigation={false}
          >
            <Stack>
              <FormStatus />
              <BodyText>
                This confirms the address for the account named in your email. It does not sign
                you in or change which account is signed in.
              </BodyText>
              <SubmitButton />
              <TextLink to="/verify-email" standalone>
                Expired link? Sign in to request another
              </TextLink>
            </Stack>
          </Form>
        )}
      </Stack>
    </WelcomeLayout>
  );
}
