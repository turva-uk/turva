/**
 * SignOffPanel Component
 *
 * The two sign-offs DCB0160 asks for, each by a different person making a
 * different judgement: the Clinical Safety Officer approves the safety
 * case, then Top Management accepts its residual risk for go-live. Each
 * shows who holds the post, where it stands, and, for the person who may
 * sign now, the action, which asks for their authenticator code.
 *
 * What may be signed is the API's to decide; this shows what it said.
 * Any change to the file after a sign-off returns it to draft, so a
 * signed file that has been edited offers approval again.
 *
 * @example
 * ```tsx
 * <SignOffPanel file={file} onSign={(kind, code) => signOff(...)} />
 * ```
 *
 * Not yet in Turva's API: sign-off has no route yet, so this takes the file's status, posts and sign-offs as a prop.
 */

import { useState } from "react";
import { Group, Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import IconTextButton from "@/components/button/IconTextButton";
import CodeConfirmModal from "@/components/confirm-modal/CodeConfirmModal";
import { BodyText, FieldDescription, Heading } from "@/components/typography";
import SafetyStatusBadge from "./SafetyStatusBadge";
import type { SafetyFileExtras } from "@/lib/safety";

type Kind = "approved" | "accepted";

export interface SignOffPanelProps {
  /** The file, with its posts and what the caller may sign */
  file: SafetyFileExtras;
  /** Sign, with the code typed. Throw to keep the dialog open. */
  onSign: (kind: Kind, code: string) => Promise<void>;
}

const BLOCKS: Record<
  Kind,
  { title: string; post: string; action: string; explanation: string }
> = {
  approved: {
    title: "Approval by the Clinical Safety Officer",
    post: "clinical_safety_officer",
    action: "Approve the safety case",
    explanation:
      "You are approving the safety case as it stands now. The file is tagged at this commit, so what you approved can always be read back.",
  },
  accepted: {
    title: "Acceptance by Top Management",
    post: "top_management",
    action: "Accept the residual risk",
    explanation:
      "You are accepting the residual risk of this deployment on the organisation's behalf, and authorising go-live.",
  },
};

function lastTag(tags: string[], kind: Kind): string | null {
  const found = tags.filter((tag) => tag.startsWith(`${kind}/`)).sort();

  return found.at(-1) ?? null;
}

export default function SignOffPanel({ file, onSign }: SignOffPanelProps) {
  const [signing, setSigning] = useState<Kind | null>(null);
  const signOffs = file.sign_offs;
  const tags = signOffs?.tags ?? [];

  function block(kind: Kind) {
    const { title, post, action } = BLOCKS[kind];
    const holder = file.posts.find((item) => item.kind === post);
    const may = kind === "approved" ? signOffs?.can_approve : signOffs?.can_accept;
    const tag = lastTag(tags, kind);
    const current =
      (kind === "approved" && (file.status === "approved" || file.status === "accepted")) ||
      (kind === "accepted" && file.status === "accepted");

    return (
      <BaseCard key={kind} data-testid={`sign-off-${kind}`}>
        <Stack gap="sm">
          <Heading>{title}</Heading>
          <BodyText>
            {holder?.holder_name
              ? `Post holder: ${holder.holder_name}`
              : "Nobody holds this post yet."}
          </BodyText>
          <FieldDescription>
            {current && tag
              ? `Signed for the file as it stands (${tag}).`
              : tag
                ? `Last signed as ${tag}; the file has changed since.`
                : "Not yet signed."}
          </FieldDescription>
          {may && !signOffs?.two_factor_enabled && (
            <BodyText>
              Set up two-factor authentication in your account settings before signing.
            </BodyText>
          )}
          {may && signOffs?.two_factor_enabled && (
            <Group justify="flex-end">
              <IconTextButton icon="check" label={action} onClick={() => setSigning(kind)} />
            </Group>
          )}
        </Stack>
      </BaseCard>
    );
  }

  return (
    <Stack gap="lg">
      <Group>
        <SafetyStatusBadge status={file.status} />
      </Group>
      {block("approved")}
      {block("accepted")}
      <CodeConfirmModal
        opened={signing !== null}
        onClose={() => setSigning(null)}
        onConfirm={(code) => (signing ? onSign(signing, code) : undefined)}
        title={signing ? BLOCKS[signing].action : ""}
        acceptLabel={signing === "accepted" ? "Accept" : "Approve"}
        submittingLabel="Signing…"
      >
        {signing ? BLOCKS[signing].explanation : ""}
      </CodeConfirmModal>
    </Stack>
  );
}
