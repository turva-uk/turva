import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "../src/styles/typography.css";
import "../src/styles/dark-overrides.css";
import "../src/styles/touch-targets.css";
import "../src/styles/disabled-controls.css";

import { MantineProvider } from "@mantine/core";
import type { Decorator, Preview } from "@storybook/react-vite";
import { createMemoryRouter, RouterProvider } from "react-router";

import type { Session, User } from "../src/api/types";
import { SessionProvider } from "../src/auth/SessionProvider";
import { EXTRA_RULES, WCAG_TAGS } from "../src/lib/accessibility/axeConfig";
import { cssVariablesResolver, theme } from "../src/theme";

/**
 * The person signed in for every story. Components that check who is reading
 * see a verified Clinical Safety Officer unless a story says otherwise.
 */
const STORY_USER: User = {
  id: "1",
  email: "alex.morgan@example.com",
  first_name: "Alex",
  last_name: "Morgan",
  full_name: "Alex Morgan",
  organisation: "Example NHS Trust",
  job_role: "Clinical Safety Officer",
  professional_regulator: "GMC",
  registration_number: "1234567",
  professional_registration: "GMC 1234567",
  registration_verified: false,
  is_cso: true,
  cso_declared_at: "2026-01-01T09:00:00Z",
  is_verified: true,
  is_staff: false,
};

/**
 * What one story lays over the signed-in user, from its
 * `parameters.mockUser`, such as `{ is_cso: false }`. Set by the decorator
 * before each story renders.
 */
let storyUser: Partial<User> = {};

/** A JSON response, as the API would send it. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Storybook has no backend. Only the API is mocked: anything else is a file
// Storybook serves itself and is fetched for real.
const realFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  if (!url.includes("/api/")) {
    return realFetch(input, init);
  }

  if (url.includes("/auth/session/")) {
    const session: Session = {
      authenticated: true,
      user: { ...STORY_USER, ...storyUser },
    };

    return json(session);
  }

  return json({ detail: "Not mocked in Storybook." }, 404);
};

/**
 * A story's `parameters.mockUser`. Storybook's parameters are untyped, so
 * anything that is not an object is ignored, and an object is taken to be
 * the `Partial<User>` the story means it to be.
 */
function mockUserFrom(value: unknown): Partial<User> {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  return value as Partial<User>;
}

const decorators: Decorator[] = [
  (Story, context) => {
    const colorScheme = context.globals["colorScheme"] === "dark" ? "dark" : "light";
    const routerPath = context.parameters["routerPath"];

    storyUser = mockUserFrom(context.parameters["mockUser"]);

    // A story that brings its own router opts out of this one.
    if (context.parameters["disableDefaultRouter"]) {
      return (
        <MantineProvider
          theme={theme}
          cssVariablesResolver={cssVariablesResolver}
          forceColorScheme={colorScheme}
        >
          <Story />
        </MantineProvider>
      );
    }

    const router = createMemoryRouter(
      [
        {
          path: "*",
          element: (
            <MantineProvider
              theme={theme}
              cssVariablesResolver={cssVariablesResolver}
              forceColorScheme={colorScheme}
            >
              <SessionProvider>
                <div
                  style={{
                    background: "var(--mantine-color-body)",
                    color: "var(--mantine-color-text)",
                    minHeight: "100vh",
                  }}
                >
                  <Story />
                </div>
              </SessionProvider>
            </MantineProvider>
          ),
        },
      ],
      { initialEntries: [typeof routerPath === "string" ? routerPath : "/"] },
    );

    return <RouterProvider router={router} />;
  },
];

const preview: Preview = {
  decorators,
  globalTypes: {
    colorScheme: {
      description: "Mantine colour scheme",
      toolbar: {
        title: "Colour scheme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    colorScheme: "light",
  },
  parameters: {
    controls: { expanded: true },
    // axe checks every story. "error" fails a story with any violation. A
    // story that must differ overrides parameters.a11y itself, with a
    // comment saying why; never switch a rule off here for everyone.
    a11y: {
      test: "error",
      options: {
        runOnly: { type: "tag", values: [...WCAG_TAGS] },
      },
      config: { rules: [...EXTRA_RULES] },
    },
    layout: "padded",
    options: {
      storySort: {
        method: "alphabetical",
        locales: "en-GB",
      },
    },
  },
};

export default preview;
