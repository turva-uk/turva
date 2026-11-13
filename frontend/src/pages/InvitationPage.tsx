import { Alert, Anchor, Box, Button, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";

import { api } from "../api/client";
import { useSubmission } from "../api/useSubmission";
import { useSession } from "../auth/useSession";
import { SaveFailure } from "../components/SaveFailure";

export function InvitationPage() {
  const { invitationId } = useParams();
  const location = useLocation();
  const { user } = useSession();
  const { run, submitting, failure } = useSubmission();
  const [accepted, setAccepted] = useState<string | null>(null);
  // The token stays in the URL fragment, not query strings or request paths.
  const token = location.hash.slice(1);
  return (
    <Box maw={720}>
      <Title order={1} size="h2" mb="md">
        Join an organisation
      </Title>
      <Text mb="md">
        This invitation grants membership only, not a CSO appointment or access to safety
        evidence. Nothing happens until you choose Accept invitation.
      </Text>
      {!user ? (
        <Stack>
          <Text>
            Sign in or register with the invited email address, confirm it, then reopen this
            invitation link from the email.
          </Text>
          <Anchor component={Link} to="/login">
            Sign in
          </Anchor>
          <Anchor component={Link} to="/register">
            Create an account
          </Anchor>
        </Stack>
      ) : !user.is_verified ? (
        <Alert color="yellow">
          Confirm your email address before accepting, then reopen this invitation.
          <Anchor component={Link} to="/verify-email" display="block">
            Confirm your email
          </Anchor>
        </Alert>
      ) : accepted ? (
        <Alert role="status" title="Membership accepted">
          <Anchor component={Link} to={`/organisations/${accepted}`}>
            Open your organisation
          </Anchor>
        </Alert>
      ) : (
        <Stack>
          <Text>
            You are signed in as {user.email}. The invitation must match this verified address.
          </Text>
          <SaveFailure
            message={failure}
            title="Could not accept invitation"
            retainsDraft={false}
          />
          {!token ? (
            <Alert color="red" role="alert">
              The invitation token is missing. Reopen the complete link from the email.
            </Alert>
          ) : (
            <Button
              loading={submitting}
              style={{ alignSelf: "flex-start" }}
              onClick={() =>
                void run(async () => {
                  const result = await api.post<{ organisation_id: string }>(
                    `/invitations/${invitationId}/accept/`,
                    { token },
                  );
                  setAccepted(result.organisation_id);
                })
              }
            >
              Accept invitation
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}
