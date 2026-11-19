import type { AssigneeStatus, MyAssignment, Post } from "@/lib/safety";

/** A supported source identity, not proof that a repository contains it. */
export function isFullSourceVersion(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
}

/** Delegates submit implementation evidence; CSOs independently verify or return it. */
export function isAssigneeStatus(value: unknown): value is AssigneeStatus {
  return value === "proposed" || value === "implemented";
}

export function assignmentContext(assignment: MyAssignment): string {
  return JSON.stringify([
    assignment.id,
    assignment.slug,
    assignment.head_sha,
    assignment.mitigation.id,
    assignment.mitigation.status,
  ]);
}

export function postHolderProblem(post: Post): string | null {
  if ((post.holder_id === null) !== (post.holder_name === null))
    return "Post holder information is unavailable: the supplied identity is incomplete.";
  if (post.holder_id !== null && (!post.holder_id.trim() || !post.holder_name?.trim()))
    return "Post holder information is unavailable: the supplied identity is incomplete.";
  if (post.holder_id === null && post.registrations.length > 0)
    return "Post holder information is unavailable: registrations were supplied without a holder.";
  return null;
}
