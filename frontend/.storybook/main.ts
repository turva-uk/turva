import type { StorybookConfig } from "@storybook/react-vite";
import remarkGfm from "remark-gfm";

/**
 * Storybook for Turva's shared components.
 *
 * `@storybook/react-vite` loads the project's own `vite.config.ts`, so the
 * `@/` alias and the PostCSS set-up in
 * `postcss.config.cjs`, with its breakpoints from `src/breakpoints.json`,
 * apply here exactly as they do to the app.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: [
    {
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
    // Forces :hover, :focus and the rest on a story, for StateRow.
    "storybook-addon-pseudo-states",
  ],
  staticDirs: ["../public"],
  core: {
    // Storybook sends anonymous usage data unless told not to.
    disableTelemetry: true,
  },
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
