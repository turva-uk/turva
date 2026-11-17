import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
// After Mantine's own stylesheet, so these win on source order. Storybook's
// preview imports the same four, so a story looks as the app does.
import "./styles/typography.css";
import "./styles/dark-overrides.css";
import "./styles/touch-targets.css";
import "./styles/disabled-controls.css";

import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { App } from "./App";
import { SessionProvider } from "./auth/SessionProvider";
import { cssVariablesResolver, theme } from "./theme";

const root = document.getElementById("root");
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
      <BrowserRouter>
        <SessionProvider>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
);
