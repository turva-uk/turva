import { Alert, Anchor, Box, Button, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router";

import { api } from "../api/client";
import { useSubmission } from "../api/useSubmission";
import { useSession } from "../auth/useSession";
import { SaveFailure } from "../components/SaveFailure";

export function VerificationNoticePage() {
  const { user, refresh } = useSession();
  const location = useLocation();
  const { run, submitting, failure } = useSubmission();
  const [message, setMessage] = useState("");
  if (user?.is_verified) return <Navigate to="/safety-files" replace />;
  return (
    <Box maw={600}>
      <Title order={1} size="h2" mb="md">
        Confirm your email address
      </Title>
      <Stack>
        <Text>
          Check the inbox for {user?.email}. Follow the confirmation link before opening or
          creating safety files. You can still edit your profile.
        </Text>
        {location.state?.emailSent === false && (
          <Alert color="yellow" title="Account created, but email delivery failed">
            Your account exists. Please wait ten minutes, then request another confirmation
            email. Contact an administrator if delivery keeps failing.
          </Alert>
        )}
        {location.state?.emailSent === true && (
          <Text role="status">A confirmation email was sent.</Text>
        )}
        <SaveFailure
          message={failure}
          title="Could not send confirmation"
          retainsDraft={false}
        />
        {message && <Alert role="status">{message}</Alert>}
        <Button
          loading={submitting}
          onClick={() =>
            void run(async () => {
              setMessage("");
              const response = await api.post<{ detail: string }>("/auth/verify/resend/");
              setMessage(response.detail);
            })
          }
          style={{ alignSelf: "flex-start" }}
        >
          Resend confirmation email
        </Button>
        <Text size="sm" c="dimmed">
          Requests are limited to one every ten minutes. A reused link keeps its original
          eight-hour expiry.
        </Text>
        <Button
          variant="outline"
          onClick={() => void refresh()}
          style={{ alignSelf: "flex-start" }}
        >
          I have confirmed my email - check again
        </Button>
        <Anchor component={Link} to="/profile">
          Edit your profile
        </Anchor>
      </Stack>
    </Box>
  );
}

export function VerificationConfirmPage() {
  const { userId, token } = useParams();
  const { user, refresh } = useSession();
  const { run, submitting, failure } = useSubmission();
  const [confirmed, setConfirmed] = useState(false);
  return (
    <Box maw={600}>
      <Title order={1} size="h2" mb="md">
        Confirm the email address in this link
      </Title>
      <SaveFailure
        message={failure}
        title="Could not confirm this address"
        retainsDraft={false}
      />
      {confirmed ? (
        <Alert role="status" title="Email address confirmed">
          <Anchor component={Link} to={user ? "/safety-files" : "/login"}>
            {user ? "Open your safety files" : "Sign in"}
          </Anchor>
        </Alert>
      ) : (
        <Stack>
          <Text>
            This confirms the address for the account named in your email. It does not sign you
            in or change which account is signed in.
          </Text>
          <Button
            loading={submitting}
            onClick={() =>
              void run(async () => {
                await api.post("/auth/verify/", { user_id: userId, token });
                await refresh();
                setConfirmed(true);
              })
            }
            style={{ alignSelf: "flex-start" }}
          >
            Confirm email address
          </Button>
          <Anchor component={Link} to="/verify-email">
            Expired link? Sign in to request another
          </Anchor>
        </Stack>
      )}
    </Box>
  );
}
