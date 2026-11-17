// Storybook test-runner Jest config, ejected so the dark-mode accessibility
// pass can be added as a setup file. Why it is not a
// .storybook/test-runner.ts hook is explained in .storybook/a11y-dark-mode.ts.
//
// Every story is checked with axe against WCAG 2.2 AA (the tags and rules in
// src/lib/accessibility/axeConfig.ts, set in .storybook/preview.tsx), once
// in light mode and again in dark.
import { fileURLToPath } from "node:url";

import { getJestConfig } from "@storybook/test-runner";

const testRunnerConfig = getJestConfig();

export default {
  ...testRunnerConfig,
  setupFilesAfterEnv: [
    ...(testRunnerConfig.setupFilesAfterEnv ?? []),
    // Absolute: the runner sets rootDir to the repository root, not here.
    fileURLToPath(new URL("./.storybook/a11y-dark-mode.ts", import.meta.url)),
  ],
};
