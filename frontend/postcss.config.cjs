// Mantine's PostCSS preset converts its `rem()` helper and responsive mixins.
// Without it, Mantine's own stylesheets render with unprocessed custom syntax.
//
// The `$mantine-breakpoint-*` variables come from src/breakpoints.json, the
// same file the Mantine theme reads, so a CSS module and a component cannot
// name different widths for the same breakpoint. Storybook reads this file too.
const breakpoints = require("./src/breakpoints.json");

const breakpointVariables = Object.fromEntries(
  Object.entries(breakpoints).map(([name, width]) => [`mantine-breakpoint-${name}`, width]),
);

module.exports = {
  plugins: {
    "postcss-preset-mantine": {},
    "postcss-simple-vars": { variables: breakpointVariables },
  },
};
