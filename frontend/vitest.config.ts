import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

const browser = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: "chromium" as const }],
});

export default mergeConfig(
  viteConfig,
  defineConfig({
    server: { host: "127.0.0.1", strictPort: false },
    optimizeDeps: { include: ["@mantine/form"] },
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            include: ["src/**/*.test.{ts,tsx}"],
            environment: "jsdom",
            globals: true,
            setupFiles: ["./src/test-setup.ts"],
          },
        },
        ...(["light", "dark"] as const).map((colorScheme) => ({
          extends: true as const,
          plugins: [
            storybookTest({
              configDir: fileURLToPath(new URL("./.storybook", import.meta.url)),
              initialGlobals: { colorScheme },
            }),
          ],
          test: {
            name: `storybook-${colorScheme}`,
            // A fixed browser API port would collide with another worktree.
            api: { host: "127.0.0.1", port: 0 },
            browser: browser(),
            maxWorkers: 2,
            testTimeout: 60000,
            setupFiles: ["./.storybook/vitest.setup.ts"],
          },
        })),
        {
          extends: true,
          test: {
            name: "storybook-gate",
            api: { host: "127.0.0.1", port: 0 },
            include: [".storybook/*.browser.test.ts"],
            browser: browser(),
            // Match the addon's standalone browser execution path.
            env: { VITEST_STORYBOOK: "false" },
            maxWorkers: 2,
            testTimeout: 30000,
          },
        },
      ],
    },
  }),
);
