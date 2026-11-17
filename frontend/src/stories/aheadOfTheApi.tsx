/**
 * Marks a story whose component shows a feature Turva's API does not
 * have yet.
 *
 * Every story in the file says so under the component, "Not yet in
 * Turva's API: ...", so nobody reads the catalogue as a list of what
 * Turva does. Take it off a component's stories when the route it needs
 * is written.
 *
 * ```tsx
 * const meta: Meta<typeof ExtractionReview> = {
 *   decorators: [aheadOfTheApi("supplier extraction")],
 * };
 * ```
 */

import type { Decorator } from "@storybook/react-vite";

import { StoryNote } from "./variants";

export function aheadOfTheApi(feature: string): Decorator {
  const AheadOfTheApi: Decorator = (Story) => (
    <>
      <Story />
      <StoryNote>Not yet in Turva&apos;s API: {feature}.</StoryNote>
    </>
  );

  return AheadOfTheApi;
}
