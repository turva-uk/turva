// The same fonts and stylesheets as Storybook's preview, so every page looks
// as the shared components do in the catalogue.
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "@fontsource-variable/finlandica";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/tiptap/styles.css";
import "./styles/typography.css";
import "./styles/dark-overrides.css";
import "./styles/touch-targets.css";
import "./styles/disabled-controls.css";

import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { App } from "./App";
import { SessionProvider } from "./auth/SessionProvider";
import { cssVariablesResolver, theme } from "./theme";

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
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="light"
    >
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
);
