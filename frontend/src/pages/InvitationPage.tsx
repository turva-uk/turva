import { Box, Stack } from "@mantine/core";
import { useState } from "react";
import { useLocation, useParams } from "react-router";

import { api } from "../api/client";
import { useSession } from "../auth/useSession";
import { Form, FormStatus, SubmitButton } from "../components/form/Form";
import { IconAlertCircle, IconAlertTriangle } from "../components/icons/appIcons";
import { StateMessage } from "../components/message-cards";
import type { FormSubmitResult } from "../components/form/Form";
import { BodyText, PageHeader, TextLink } from "../components/typography";
import { apiFailure } from "../lib/forms";

/** Accepting sends no fields, only the token from the link. */
type NoValues = Record<string, never>;

export function InvitationPage() {
  const { invitationId } = useParams();
  const location = useLocation();
  const { user } = useSession();
  const [accepted, setAccepted] = useState<string | null>(null);
  // The token stays in the URL fragment, not query strings or request paths.
  const token = location.hash.slice(1);

  async function accept(): Promise<FormSubmitResult<NoValues>> {
    try {
      const result = await api.post<{ organisation_id: string }>(
        `/invitations/${invitationId}/accept/`,
        { token },
      );
      setAccepted(result.organisation_id);

      return { state: "success", message: { title: "Membership accepted" } };
    } catch (error) {
      return apiFailure<NoValues>(error, "Could not accept invitation", []);
    }
  }

  return (
    <Box maw={720}>
      <Stack>
        <PageHeader title="Join an organisation" />
        <BodyText>
          This invitation grants membership only, not a CSO appointment or access to safety
          evidence. Nothing happens until you choose Accept invitation.
        </BodyText>

        {!user ? (
          <Stack>
            <BodyText>
              Sign in or register with the invited email address, confirm it, then reopen this
              invitation link from the email.
            </BodyText>
            <TextLink to="/login" standalone>
              Sign in
            </TextLink>
            <TextLink to="/register" standalone>
              Create an account
            </TextLink>
          </Stack>
        ) : !user.is_verified ? (
          <Stack>
            <StateMessage
              icon={<IconAlertTriangle />}
              colour="warning"
              title="Confirm your email address first"
              description="Confirm your email address before accepting, then reopen this invitation."
            />
            <TextLink to="/verify-email" standalone>
              Confirm your email
            </TextLink>
          </Stack>
        ) : accepted ? (
          <Stack>
            <FormStatus variant="success" title="Membership accepted" />
            <TextLink to={`/organisations/${accepted}`} standalone>
              Open your organisation
            </TextLink>
          </Stack>
        ) : (
          <Stack>
            <BodyText>
              You are signed in as {user.email}. The invitation must match this verified
              address.
            </BodyText>
            {!token ? (
              <Box role="alert">
                <StateMessage
                  icon={<IconAlertCircle />}
                  colour="alert"
                  title="The invitation token is missing"
                  description="Reopen the complete link from the email."
                />
              </Box>
            ) : (
              <Form<NoValues>
                defaultValues={{}}
                onSubmit={accept}
                submitLabel="Accept invitation"
                submittingLabel="Accepting…"
                blockNavigation={false}
              >
                <Stack>
                  <FormStatus />
                  <SubmitButton />
                </Stack>
              </Form>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
