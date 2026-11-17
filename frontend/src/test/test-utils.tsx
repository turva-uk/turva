/**
 * Testing Utilities
 *
 * Custom render functions and utilities for testing React components
 * with common providers (Router, Mantine, Auth).
 */

/* eslint-disable react-refresh/only-export-components */

import { render } from "@testing-library/react";
import { expect } from "vitest";
import type { RenderOptions } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import {
  BrowserRouter,
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from "react-router";
import type { ReactElement, ReactNode } from "react";
import { theme, cssVariablesResolver } from "@/theme";
import { PageMessageProvider } from "@/components/page-message";
import PageMessageDisplay from "@/components/page-message/PageMessageDisplay";

/**
 * Render options with all providers
 */
interface AllProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial route for React Router */
  initialRoute?: string;
  /** Route path pattern (e.g. "/safety-files/:slug") for route params */
  routePath?: string;
}

/**
 * Wrapper with Mantine Provider
 */
function MantineWrapper({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
      {children}
    </MantineProvider>
  );
}

/**
 * Wrapper with Router and Mantine
 */
function RouterAndMantineWrapper({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
        <PageMessageProvider>
          <PageMessageDisplay fallback />
          {children}
        </PageMessageProvider>
      </MantineProvider>
    </BrowserRouter>
  );
}

/**
 * Render component with Mantine Provider
 *
 * Use this for testing components that use Mantine UI components
 * but don't need routing or authentication.
 *
 * @example
 * const { getByText } = renderWithMantine(<MyComponent />);
 */
export function renderWithMantine(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: MantineWrapper, ...options });
}

/**
 * Render component with Router and Mantine Provider
 *
 * Use this for testing components that use routing (Link, useNavigate)
 * and Mantine UI components.
 *
 * If you need to test route parameters, provide both `routePath` and `initialRoute`:
 * @example
 * // For a route with params like "/safety-files/:slug"
 * const { getByRole } = renderWithRouter(<SafetyFileDetailPage />, {
 *   routePath: "/safety-files/:slug",
 *   initialRoute: "/safety-files/example"
 * });
 *
 * @example
 * // For simple routes without params
 * const { getByRole } = renderWithRouter(<LoginPage />);
 */
export function renderWithRouter(ui: ReactElement, options?: AllProvidersOptions) {
  const { initialRoute, routePath, ...renderOptions } = options ?? {};

  // If a routePath is provided, use a data router to support useBlocker/useParams
  if (routePath) {
    const router = createMemoryRouter(
      [
        {
          path: routePath,
          element: (
            <PageMessageProvider>
              <PageMessageDisplay fallback />
              {ui}
            </PageMessageProvider>
          ),
        },
      ],
      {
        initialEntries: [initialRoute || "/"],
      },
    );
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
        {children}
      </MantineProvider>
    );
    return render(<RouterProvider router={router} />, {
      wrapper: Wrapper,
      ...renderOptions,
    });
  }

  // Otherwise use BrowserRouter for simple routes
  if (initialRoute) {
    window.history.pushState({}, "Test page", initialRoute);
  }

  return render(ui, { wrapper: RouterAndMantineWrapper, ...renderOptions });
}

/**
 * Render a list of routes, as `routes.tsx` declares them, at an address.
 *
 * For a test of the routes themselves rather than of one page: their
 * guards, and the lazy pages they load. A data router renders once the
 * matched route's lazy page has loaded, so wait with `findBy...`.
 *
 * @example
 * renderRoutes([safetyFilesRoute], "/safety-files");
 * expect(await screen.findByText("404 - Page not found")).toBeInTheDocument();
 */
export function renderRoutes(routes: RouteObject[], initialRoute: string) {
  const router = createMemoryRouter(routes, {
    initialEntries: [initialRoute],
  });

  return render(<RouterProvider router={router} />, {
    wrapper: MantineWrapper,
  });
}

/**
 * Create a mock fetch response
 *
 * Helper for creating mock fetch responses in tests.
 *
 * @example
 * global.fetch = vi.fn().mockResolvedValue(
 *   createMockResponse({ data: "test" })
 * );
 */
export function createMockResponse(
  data: unknown,
  options: { status?: number; statusText?: string } = {},
): Response {
  const { status = 200, statusText = "OK" } = options;

  // A real Response, so every member a caller might read is there and
  // `ok` follows the status as it does in a browser
  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Wait for a condition to be true
 *
 * Alternative to waitFor that's more flexible.
 *
 * @example
 * await waitForCondition(() => mockFn.mock.calls.length > 0);
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 1000,
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Convert a length written in `rem` into the `px` string a computed style
 * reports.
 *
 * From jsdom 30 onwards `getComputedStyle` resolves relative lengths against
 * the root font size rather than echoing the authored value back, so
 * `toHaveStyle({ height: "8rem" })` no longer matches an element styled
 * `height: 8rem` - the computed value is `128px`. Wrapping the authored value
 * keeps the assertion readable and leaves the arithmetic in one place.
 *
 * Multiple values are converted individually, so shorthands work too.
 *
 * @example
 * expect(img).toHaveStyle({ height: remToPx("8rem") }); // "128px"
 * expect(button).toHaveStyle({ padding: remToPx("0.5rem 1rem") }); // "8px 16px"
 */
export function remToPx(value: string, rootFontSize = 16): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => {
      const match = /^(-?(?:\d*\.)?\d+)rem$/.exec(part);
      if (!match) return part;
      const px = Number(match[1]) * rootFontSize;
      // Trim floating-point noise (2.1rem * 16 = 33.6, not 33.599999999999994)
      return `${Number(px.toFixed(5))}px`;
    })
    .join(" ");
}

/** A CSS property as `element.style` names it, such as `fontSize`. */
type InlineStyleProperty = {
  [Key in keyof CSSStyleDeclaration]: CSSStyleDeclaration[Key] extends string ? Key : never;
}[keyof CSSStyleDeclaration];

/**
 * Assert an element's inline style, property by property and exactly.
 *
 * For a style set to a CSS variable, such as Mantine's
 * `var(--mantine-font-size-md)`. jsdom resolves only the variables the
 * theme's resolver defines, so `toHaveStyle` reads Mantine's own variables
 * as unset; the inline style is what the component actually set.
 *
 * @example
 * expectInlineStyle(label, { fontSize: "var(--mantine-font-size-md)" });
 */
export function expectInlineStyle(
  element: HTMLElement,
  expected: Partial<Record<InlineStyleProperty, string>>,
): void {
  for (const [property, value] of Object.entries(expected)) {
    expect(element.style.getPropertyValue(toKebabCase(property)), property).toBe(value);
  }
}

/** `fontSize` to `font-size`, as `getPropertyValue` wants it. */
function toKebabCase(property: string): string {
  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
