/**
 * SignOffPanel Component
 *
 * Retained proposal for two-stage sign-off, which is deferred from the
 * funded build. This component creates no tags, approval or authority.
 * Supplied tag names do not establish a signer, source version or date.
 *
 * @example
 * ```tsx
 * <SignOffPanel file={file} head={openedHead} onSign={(kind, code, head) => propose(...)} />
 * ```
 *
 * Not yet in Turva's API: sign-off has no route yet, so this takes the file's status, posts and sign-offs as a prop.
 */

import { useState } from "react";
import { Alert, Stack } from "@mantine/core";
import BaseCard from "@/components/base-card/BaseCard";
import IconTextButton from "@/components/button/IconTextButton";
import CodeConfirmModal from "@/components/confirm-modal/CodeConfirmModal";
import { BodyText, FieldDescription, Heading } from "@/components/typography";
import { isSafetyFileStatus, type SafetyFileExtras } from "@/lib/safety";
import { isFullSourceVersion, postHolderProblem } from "./proposedWorkflow";

type Kind = "approved" | "accepted";

export interface SignOffPanelProps {
  /** The file, with its posts and what the caller may sign */
  file: SafetyFileExtras;
  /** The exact version the person opened. A missing/unsupported version cannot be signed. */
  head: string | null;
  /** Proposal only. A future service must recheck identity, live authority and this opened version. Throw to retain the dialog. */
  onSign: (kind: Kind, code: string, expectedHead: string) => Promise<void>;
}

const BLOCKS: Record<Kind, { title: string; post: string; action: string }> = {
  approved: {
    title: "Approval by the Clinical Safety Officer",
    post: "clinical_safety_officer",
    action: "Approve the safety case",
  },
  accepted: {
    title: "Acceptance by Top Management",
    post: "top_management",
    action: "Accept the residual risk",
  },
};

function signOffProblem(file: SafetyFileExtras, head: string | null): string | null {
  if (!isFullSourceVersion(head))
    return "Source version unavailable: a supported full opened commit is required.";
  if (!file.sign_offs)
    return "Sign-off information is unavailable. No conclusion about previous signatures can be drawn.";
  if (!isSafetyFileStatus(file.status))
    return `Unsupported reported safety-file status: ${String(file.status)}.`;
  const { can_approve, can_accept, two_factor_enabled, tags } = file.sign_offs;
  if ([can_approve, can_accept, two_factor_enabled].some((value) => typeof value !== "boolean"))
    return "Sign-off permissions are unavailable or unsupported.";
  if ((can_approve && file.status !== "draft") || (can_accept && file.status !== "approved"))
    return "Sign-off permissions are inconsistent with the reported file status.";
  if (
    (file.status === "approved" || file.status === "accepted") &&
    !tags.some((tag) => tag.startsWith("approved/"))
  )
    return "The reported approval has no supplied approval reference. Sign-off information is incomplete.";
  if (file.status === "accepted" && !tags.some((tag) => tag.startsWith("accepted/")))
    return "The reported acceptance has no supplied acceptance reference. Sign-off information is incomplete.";
  for (const kind of ["approved", "accepted"] as const) {
    const may = kind === "approved" ? can_approve : can_accept;
    if (!may) continue;
    const holders = file.posts.filter((post) => post.kind === BLOCKS[kind].post);
    if (holders.length !== 1 || !holders[0]!.holder_id || postHolderProblem(holders[0]!))
      return "Sign-off post-holder information is unavailable or inconsistent.";
  }
  return null;
}

type OpenedConfirmation = {
  kind: Kind;
  context: string;
  fileName: string;
  head: string;
  handler: SignOffPanelProps["onSign"];
};

export default function SignOffPanel({ file, head, onSign }: SignOffPanelProps) {
  const [signing, setSigning] = useState<OpenedConfirmation | null>(null);
  const [invalidated, setInvalidated] = useState(false);
  const signOffs = file.sign_offs;
  const problem = signOffProblem(file, head);
  const context = JSON.stringify([
    file.safety_file.id,
    file.safety_file.slug,
    file.safety_file.name,
    head,
    file.status,
    signOffs?.can_approve,
    signOffs?.can_accept,
    signOffs?.two_factor_enabled,
    signOffs?.tags,
    file.posts.map((post) => [post.kind, post.holder_id, post.holder_name]),
  ]);
  const differs =
    !!signing && (signing.context !== context || signing.handler !== onSign || !!problem);
  // A revoked/replaced context cannot revive this confirmation by returning
  // to the old values. A new opening requires a deliberate review.
  if (differs && !invalidated) setInvalidated(true);
  const stale = invalidated || differs;

  async function confirm(code: string) {
    if (!signing || stale)
      throw new Error(
        "The confirmation context has changed. Cancel and review the file/version and current permission before opening a new confirmation.",
      );
    await signing.handler(signing.kind, code, signing.head);
  }

  function block(kind: Kind) {
    const { title, post, action } = BLOCKS[kind];
    const holder = file.posts.find((item) => item.kind === post);
    const may =
      !problem && (kind === "approved" ? signOffs?.can_approve : signOffs?.can_accept);

    return (
      <BaseCard key={kind} data-testid={`sign-off-${kind}`}>
        <Stack gap="sm">
          <Heading>{title}</Heading>
          <BodyText>
            {holder && !postHolderProblem(holder)
              ? holder.holder_name
                ? `Post holder: ${holder.holder_name}`
                : "Nobody holds this post yet."
              : "Post-holder information was not supplied or is inconsistent."}
          </BodyText>
          <FieldDescription>
            This proposal does not establish whether this person has signed the opened version.
          </FieldDescription>
          {may && !signOffs?.two_factor_enabled && (
            <BodyText>
              This retained proposal would require two-factor authentication. No sign-off or
              two-factor setup workflow is implemented by this component.
            </BodyText>
          )}
          {may && signOffs?.two_factor_enabled && (
            <IconTextButton
              icon="check"
              label={action}
              disabled={signing !== null}
              onClick={() => {
                if (!problem && isFullSourceVersion(head) && signing === null) {
                  setInvalidated(false);
                  setSigning({
                    kind,
                    context,
                    head,
                    fileName: file.safety_file.name,
                    handler: onSign,
                  });
                }
              }}
            />
          )}
        </Stack>
      </BaseCard>
    );
  }

  return (
    <Stack gap="lg">
      <BodyText>
        Retained sign-off proposal only. Formal sign-off is deferred from the funded build; this
        view creates no signature, tag or clinical approval.
      </BodyText>
      <BodyText preserveLines>
        Reported file status: {String(file.status)}. Opened source version:{" "}
        {head ?? "Not supplied"}.
      </BodyText>
      {problem && (
        <Alert role="alert" color="yellow" title="Sign-off proposal unavailable">
          {problem}
        </Alert>
      )}
      {stale && (
        <BodyText>
          The displayed file or permission differs from the opened confirmation. No new request
          will be sent from that confirmation.
        </BodyText>
      )}
      <Stack gap={4}>
        <BodyText>
          Supplied tag names do not establish chronology, signer identity, source version or
          clinical approval.
        </BodyText>
        {signOffs?.tags.length ? (
          signOffs.tags.map((tag, index) => (
            <BodyText key={`${index}:${tag}`} preserveLines>
              {tag}
            </BodyText>
          ))
        ) : (
          <BodyText>No sign-off references were supplied.</BodyText>
        )}
      </Stack>
      {block("approved")}
      {block("accepted")}
      <CodeConfirmModal
        opened={signing !== null}
        onClose={() => setSigning(null)}
        onConfirm={confirm}
        title={signing ? BLOCKS[signing.kind].action : ""}
        acceptLabel={signing?.kind === "accepted" ? "Accept" : "Approve"}
        submittingLabel="Submitting proposal…"
      >
        {signing && (
          <>
            Proposed {signing.kind === "approved" ? "approval" : "acceptance"} for{" "}
            {signing.fileName}, opened commit{" "}
            <code style={{ overflowWrap: "anywhere" }}>{signing.head}</code>. This demonstration
            does not sign or tag evidence. A future service must check live authority and this
            exact version.
          </>
        )}
      </CodeConfirmModal>
    </Stack>
  );
}
