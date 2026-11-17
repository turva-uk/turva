/**
 * Dark-mode accessibility pass for the Storybook test-runner.
 *
 * The a11y addon checks each story once, in whatever colour scheme it
 * renders in, which is light unless the story pins another. Contrast
 * failures in dark mode never show in light, so after the normal visit
 * this switches the `colorScheme` global to dark, waits for the story to
 * re-render (which re-runs the addon's axe check), and reports what that
 * second check found under the story's own `parameters.a11y.test`: fail
 * the test on "error", print a warning on "todo", skip on "off".
 *
 * Why this is a Jest setup file and not `.storybook/test-runner.ts`:
 * Storybook 10 loads that file through a TypeScript loader it installs
 * with `module.register()`, and Jest 30.5 refuses `module.register()`
 * inside a test environment. So any test-runner config file fails every
 * suite before a story runs. `test-runner-jest.config.js` adds this file
 * to `setupFilesAfterEnv` instead, where Jest's own transform compiles it,
 * and it installs the hook on the global the runner reads.
 */

// Types only: a runtime import of the package goes through the same
// module.register() call.
import type { TestRunnerConfig } from "@storybook/test-runner";

type Page = Parameters<NonNullable<TestRunnerConfig["postVisit"]>>[0];

/** How long to wait for a story to re-render after a global changes. */
const RERENDER_TIMEOUT_MS = 15000;

/** One axe violation, trimmed to what the report needs. */
export interface DarkViolation {
  id: string;
  help: string;
  targets: string[];
}

/**
 * Change the `colorScheme` global inside the preview iframe, wait for the
 * story to finish re-rendering, and return the a11y addon's violations
 * from that render. Resolves to null if the story does not re-render in
 * time, so a stuck story is reported rather than hanging the run.
 */
async function renderInScheme(
  page: Page,
  colorScheme: "light" | "dark",
): Promise<DarkViolation[] | null> {
  return page.evaluate(
    ({ scheme, timeout }) =>
      new Promise<DarkViolation[] | null>((resolve) => {
        const g = globalThis as unknown as {
          __STORYBOOK_ADDONS_CHANNEL__: {
            on: (event: string, fn: (data: unknown) => void) => void;
            off: (event: string, fn: (data: unknown) => void) => void;
            emit: (event: string, data: unknown) => void;
          };
          __STORYBOOK_MODULE_CORE_EVENTS__: Record<string, string>;
        };
        const channel = g.__STORYBOOK_ADDONS_CHANNEL__;
        const events = g.__STORYBOOK_MODULE_CORE_EVENTS__;
        const finishedEvent = events.STORY_FINISHED ?? events.STORY_RENDERED;
        const updateGlobals = events.UPDATE_GLOBALS;

        // Without the events there is no way to re-render the story, which is
        // reported as a story that did not re-render.
        if (finishedEvent === undefined || updateGlobals === undefined) {
          resolve(null);
          return;
        }

        // Named again once known to be set, so the handler below, which is
        // hoisted, sees a string.
        const finished: string = finishedEvent;

        const timer = setTimeout(() => {
          channel.off(finished, onFinished);
          resolve(null);
        }, timeout);

        function onFinished(data: unknown): void {
          clearTimeout(timer);
          channel.off(finished, onFinished);
          const reporters =
            (data as { reporters?: { type: string; result?: unknown }[] })?.reporters ?? [];
          const a11y = reporters.find((r) => r.type === "a11y");
          const violations =
            (
              a11y?.result as {
                violations?: {
                  id: string;
                  help: string;
                  nodes: { target: unknown[] }[];
                }[];
              }
            )?.violations ?? [];
          resolve(
            violations.map((v) => ({
              id: v.id,
              help: v.help,
              targets: v.nodes.map((n) => n.target.join(" ")),
            })),
          );
        }

        channel.on(finished, onFinished);
        channel.emit(updateGlobals, {
          globals: { colorScheme: scheme },
        });
      }),
    { scheme: colorScheme, timeout: RERENDER_TIMEOUT_MS },
  );
}

/** Format violations the way a reviewer reads them in a CI log. */
export function formatDarkViolations(title: string, violations: DarkViolation[]): string {
  const lines = violations.map(
    (v) => `  ${v.id}: ${v.help}\n` + v.targets.map((t) => `    - ${t}`).join("\n"),
  );
  return `${title} (dark mode) has accessibility violations:\n${lines.join("\n")}`;
}

/** The parts of a story's prepared context this hook reads. */
interface StorySettings {
  a11y?: { test?: "off" | "todo" | "error"; disable?: boolean };
  pinnedScheme?: string;
}

/**
 * Read the story's a11y parameters and any colour scheme it pins. The
 * same lookup `getStoryContext` makes, narrowed to plain data so it
 * survives the trip out of the browser.
 */
async function readStorySettings(page: Page, storyId: string): Promise<StorySettings> {
  return page.evaluate(async (id) => {
    const g = globalThis as unknown as {
      __getContext: (id: string) => Promise<{
        parameters?: { a11y?: StorySettings["a11y"] };
        storyGlobals?: { colorScheme?: string };
      }>;
    };
    const story = await g.__getContext(id);
    return {
      a11y: story.parameters?.a11y,
      pinnedScheme: story.storyGlobals?.colorScheme,
    };
  }, storyId);
}

export const postVisit: NonNullable<TestRunnerConfig["postVisit"]> = async function postVisit(
  page,
  context,
) {
  // The runner also calls this after a failed visit, which has already
  // been reported; a second render would only bury that failure.
  if ((context as { hasFailure?: boolean }).hasFailure) return;

  const { a11y, pinnedScheme } = await readStorySettings(page, context.id);
  if (!a11y || a11y.disable === true || a11y.test === "off") return;

  // A story that pins its own colour scheme has already been checked in
  // it, and changing the global would not re-render it anyway.
  if (pinnedScheme !== undefined) return;

  const violations = await renderInScheme(page, "dark");
  // Put the preview back, so the next story starts in light.
  await renderInScheme(page, "light");

  const title = `${context.title} > ${context.name}`;
  if (violations === null) {
    throw new Error(`${title} did not re-render in dark mode`);
  }
  if (violations.length === 0) return;

  const message = formatDarkViolations(title, violations);
  if (a11y.test === "error") throw new Error(message);
  console.warn(message);
};

// The runner calls this global after each story's own checks pass.
(globalThis as { __sbPostVisit?: typeof postVisit }).__sbPostVisit = postVisit;
