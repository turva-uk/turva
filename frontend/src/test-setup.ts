import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

Object.defineProperty(document, "fonts", { value: new EventTarget() });

// jsdom has no layout observer. Mantine's dropdown scroll area requires the
// browser API even when closed; rendered sizing is checked in a real browser.
Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  },
});

// jsdom does not scroll. Mantine's Select and Combobox, and FormStatus,
// which brings a new message into view, call scrollIntoView; where the
// element lands is checked in a real browser.
window.HTMLElement.prototype.scrollIntoView = () => undefined;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
