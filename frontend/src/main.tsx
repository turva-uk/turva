import "@mantine/core/styles.css";

// No fonts and no shared stylesheets here. They restyle every page, and
// Turva's existing pages keep their own look until each moves across to the
// shared components. Storybook's preview imports them, with `theme.ts`.

import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { App } from "./App";
import { SessionProvider } from "./auth/SessionProvider";
import { legacyCssVariablesResolver, legacyTheme } from "./legacyTheme";

const root = document.getElementById("root");
// Shared dirty-form protection needs a data router, not BrowserRouter.
const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <SessionProvider>
        <App />
      </SessionProvider>
    ),
  },
]);
if (!root) {
  throw new Error("No #root element: index.html and this entry point disagree.");
}

createRoot(root).render(
  <StrictMode>
    <MantineProvider
      theme={legacyTheme}
      cssVariablesResolver={legacyCssVariablesResolver}
      defaultColorScheme="light"
    >
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
);
