import { afterEach } from "vitest";
import { assertA11yReports, type A11ySettings } from "./assert-a11y-reports";

// The addon applies the preview and framework annotations automatically.
// Keep them intact, and do not import the jsdom unit setup here.
afterEach((context) => {
  if (context.task.result?.state === "fail") return;
  const { story } = context as typeof context & {
    story?: {
      id: string;
      parameters: { a11y?: A11ySettings };
      reporting: { reports: unknown };
    };
  };
  if (!story) throw new Error("The Storybook test did not provide a rendered story");
  assertA11yReports(story.id, story.reporting?.reports, story.parameters.a11y);
});
