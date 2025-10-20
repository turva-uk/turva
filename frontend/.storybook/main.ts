import { defineMain } from "@storybook/react-vite/node";
export default defineMain({
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
    "storybook-dark-mode",
    "storybook-addon-remix-react-router"
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {}
  },
  features: {
    experimentalTestSyntax: true
  },
});