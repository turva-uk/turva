import { Box, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";

import { ApiError, api } from "../api/client";
import type { InvitationPreview } from "../api/types";
import { useSession } from "../auth/useSession";
import { Form, FormStatus, SubmitButton } from "../components/form/Form";
import { BaseCard } from "../components/base-card";
import { IconAlertCircle, IconAlertTriangle } from "../components/icons/appIcons";
import { WelcomeLayout } from "../components/layouts";
import { PageSpinner } from "../components/loading-spinner";
import { StateMessage } from "../components/message-cards";
import type { FormSubmitResult } from "../components/form/Form";
import { BodyText, BodyTextBold, PageHeader, TextLink } from "../components/typography";
import { apiFailure } from "../lib/forms";

/** Accepting sends no fields, only the token from the link. */
type NoValues = Record<string, never>;

type PreviewState =
  | { status: "loading" }
  | { status: "ready"; preview: InvitationPreview }
  | { status: "failed"; message: string };

const MEMBERSHIP_ONLY =
  "This invitation grants membership only, not a CSO appointment or access to safety evidence. Nothing happens until you choose Accept invitation.";

/**
 * Ask the server what the invitation is for, so nobody accepts one blind.
 * A POST, so the token from the link's fragment stays in the request body
 * and out of every URL.
 */
function useInvitationPreview(invitationId: string | undefined, token: string): PreviewState {
  const key = `${invitationId ?? ""}#${token}`;
  const [result, setResult] = useState<{ key: string; state: PreviewState } | null>(null);

  useEffect(() => {
    if (!invitationId || !token) return;
    let cancelled = false;

    api
      .post<InvitationPreview>(`/invitations/${invitationId}/preview/`, { token })
      .then((preview) => {
        if (!cancelled) setResult({ key, state: { status: "ready", preview } });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const message =
          cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.";
        setResult({ key, state: { status: "failed", message } });
      });

    return () => {
      cancelled = true;
    };
  }, [invitationId, token, key]);

  return result?.key === key ? result.state : { status: "loading" };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Who sent the invitation, and for which organisation. A plain card, not a
 * coloured message: it is the page's subject, not an alert. It says "you"
 * rather than the address, which the page gives just below it.
 */
function InvitationDetails({ preview }: { preview: InvitationPreview }) {
  const sentence = `${preview.inviter_name} has invited you to join ${preview.organisation_name}. The invitation expires on ${formatDate(preview.expires_at)}.`;

  return (
    <BaseCard>
      <Stack gap="xs">
        <BodyTextBold>{preview.organisation_name}</BodyTextBold>
        <BodyText>{sentence}</BodyText>
      </Stack>
    </BaseCard>
  );
}

function MissingToken() {
  return (
    <Box role="alert">
      <StateMessage
        icon={<IconAlertCircle />}
        colour="alert"
        title="The invitation token is missing"
        description="Reopen the complete link from the email."
      />
    </Box>
  );
}

function Unusable({ message }: { message: string }) {
  return (
    <Box role="alert">
      <StateMessage
        icon={<IconAlertCircle />}
        colour="alert"
        title="This invitation cannot be used"
        description={`${message} Ask whoever invited you to send a new invitation.`}
      />
    </Box>
  );
}

export function InvitationPage() {
  const { invitationId } = useParams();
  const location = useLocation();
  const { user } = useSession();
  const [accepted, setAccepted] = useState<string | null>(null);
  // The token stays in the URL fragment, not query strings or request paths.
  const token = location.hash.slice(1);
  const preview = useInvitationPreview(invitationId, token);

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

  // The organisation is named before anything else, so the page never asks
  // anyone to sign in for, or accept, an invitation it has not described.
  const about = !token ? (
    <MissingToken />
  ) : preview.status === "loading" ? (
    <PageSpinner label="Checking the invitation" />
  ) : preview.status === "failed" ? (
    <Unusable message={preview.message} />
  ) : (
    <InvitationDetails preview={preview.preview} />
  );

  if (!user) {
    return (
      <WelcomeLayout>
        <Stack>
          <PageHeader title="Join an organisation" />
          {about}
          {preview.status === "ready" && (
            <Stack>
              <BodyText>{MEMBERSHIP_ONLY}</BodyText>
              <BodyText>
                Sign in or register as {preview.preview.email}, confirm the address, then reopen
                this invitation link from the email.
              </BodyText>
              <TextLink to="/login" standalone>
                Sign in
              </TextLink>
              <TextLink to="/register" standalone>
                Create an account
              </TextLink>
            </Stack>
          )}
        </Stack>
      </WelcomeLayout>
    );
  }

  const invitedElsewhere =
    preview.status === "ready" && preview.preview.email !== user.email.toLowerCase();

  return (
    <Box maw={720}>
      <Stack>
        <PageHeader title="Join an organisation" />
        {about}

        {preview.status !== "ready" ? null : !user.is_verified ? (
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
            <BodyText>You are now a member of {preview.preview.organisation_name}.</BodyText>
            <TextLink to={`/organisations/${accepted}`} standalone>
              Open your organisation
            </TextLink>
          </Stack>
        ) : invitedElsewhere ? (
          <StateMessage
            icon={<IconAlertTriangle />}
            colour="warning"
            title="This invitation is for another address"
            description={`It was sent to ${preview.preview.email}, but you are signed in as ${user.email}. Sign out, then sign in as ${preview.preview.email} to accept it.`}
          />
        ) : (
          <Stack>
            <BodyText>{MEMBERSHIP_ONLY}</BodyText>
            <BodyText>You are signed in as {user.email}.</BodyText>
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
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
