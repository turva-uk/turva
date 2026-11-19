/**
 * Marks a story whose component shows a feature Turva's API does not
 * have yet.
 *
 * Every story in the file says so above the component, "Not yet in
 * Turva's API: ...", so nobody reads the catalogue as a list of what
 * Turva does. Remove it only when the corresponding behaviour has been
 * implemented and checked, not merely when a route name exists.
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
      <StoryNote>
        Interface demonstration only. Not yet in Turva&apos;s API: {feature}.
      </StoryNote>
      <Story />
    </>
  );

  return AheadOfTheApi;
}
