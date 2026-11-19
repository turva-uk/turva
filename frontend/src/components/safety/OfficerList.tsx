/**
 * OfficerList Component
 *
 * The safety posts at a file's organisation, one card each: the Clinical
 * Safety Officer, who approves a safety case, and Top Management, who
 * accept its residual risk for go-live. Each says who holds it, or that it
 * is vacant, which is a state worth chasing.
 *
 * A registration is shown as recorded, and always marked not verified:
 * Turva checks no regulator's register, and a printed number must never
 * read as checked (Turva's hazard TH-009).
 *
 * Not yet in Turva's API: the safety posts have no route yet, so this takes them as a prop.
 */

import { Alert, SimpleGrid, Stack } from "@mantine/core";
import { BaseCard, CardActionRow } from "@/components/base-card";
import IconButton from "@/components/button/IconButton";
import { IconPencil } from "@/components/icons/appIcons";
import { BodyText, BodyTextBold } from "@/components/typography";
import type { Post } from "@/lib/safety";
import { postHolderProblem } from "./proposedWorkflow";
import { BrandSpinner } from "@/components/loading-spinner";

export interface OfficerListProps {
  posts: Post[];
  /**
   * Called with the post whose edit icon was pressed. Without it no icon
   * is drawn, so the list reads the same anywhere it is only read.
   */
  onEdit?: (post: Post) => void;
  loading?: boolean;
  error?: string | null;
}

export default function OfficerList({ posts, onEdit, loading, error }: OfficerListProps) {
  if (error)
    return (
      <Alert role="alert" color="red" title="Safety posts unavailable">
        {error}
      </Alert>
    );
  if (loading) return <BrandSpinner label="Reading safety posts" />;
  if (posts.length === 0) return <BodyText>No safety posts were supplied.</BodyText>;
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
      {posts.map((post) => (
        <BaseCard key={post.kind}>
          <CardActionRow
            action={
              onEdit && (
                <IconButton
                  icon={<IconPencil />}
                  variant="subtle"
                  color="primary"
                  aria-label={`Appoint ${post.title}`}
                  onClick={() => onEdit(post)}
                />
              )
            }
          >
            <BodyTextBold>{post.title}</BodyTextBold>
            {postHolderProblem(post) ? (
              <Alert role="alert" color="yellow" title="Post holder unavailable">
                {postHolderProblem(post)}
                <BodyText preserveLines>
                  Recorded identity: {post.holder_id ?? "Not supplied"}; name:{" "}
                  {post.holder_name ?? "Not supplied"}.
                </BodyText>
              </Alert>
            ) : post.holder_name ? (
              <>
                <BodyText>{post.holder_name}</BodyText>
              </>
            ) : (
              <BodyText c="dimmed">Vacant</BodyText>
            )}
            <Stack gap={4}>
              {post.registrations.map((registration, index) => (
                <BodyText key={`${index}:${registration}`} preserveLines c="dimmed">
                  {registration}, not verified
                </BodyText>
              ))}
              {post.registration_verified && (
                <Alert role="alert" color="yellow" title="Unsupported verification claim">
                  The supplied record claims verification. Turva does not check professional
                  registers; the recorded registrations are not verified by this view.
                </Alert>
              )}
            </Stack>
          </CardActionRow>
        </BaseCard>
      ))}
    </SimpleGrid>
  );
}
