import addonA11y from "@storybook/addon-a11y";
import addonDocs from "@storybook/addon-docs";
import { definePreview } from "@storybook/react-vite";
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
// import { UserGroupsProvider } from '../src/app/contexts/UserGroupsContext';

import '@mantine/core/styles.css';
import { theme } from "#src/theme.ts";

// eslint-disable-next-line react-refresh/only-export-components
export default definePreview({
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },

  decorators: [
    (Story) => (
      <MantineProvider defaultColorScheme="light" theme={theme}>
        <Notifications />
        <Story />
      </MantineProvider>
    ),
  ],

  addons: [addonDocs(), addonA11y()]
});