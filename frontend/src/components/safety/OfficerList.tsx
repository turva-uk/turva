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

import { SimpleGrid } from "@mantine/core";
import { BaseCard, CardActionRow } from "@/components/base-card";
import IconButton from "@/components/button/IconButton";
import { IconPencil } from "@/components/icons/appIcons";
import { BodyText, BodyTextBold } from "@/components/typography";
import type { Post } from "@/lib/safety";

export interface OfficerListProps {
  posts: Post[];
  /**
   * Called with the post whose edit icon was pressed. Without it no icon
   * is drawn, so the list reads the same anywhere it is only read.
   */
  onEdit?: (post: Post) => void;
}

export default function OfficerList({ posts, onEdit }: OfficerListProps) {
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
            {post.holder_name ? (
              <>
                <BodyText>{post.holder_name}</BodyText>
                {post.registrations.map((registration) => (
                  <BodyText key={registration} c="dimmed">
                    {registration}
                    {post.registration_verified ? "" : ", not verified"}
                  </BodyText>
                ))}
              </>
            ) : (
              <BodyText c="dimmed">Vacant</BodyText>
            )}
          </CardActionRow>
        </BaseCard>
      ))}
    </SimpleGrid>
  );
}
