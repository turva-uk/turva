/**
 * PageMessageContext
 *
 * Centralised page-level message system. Provides a context and hook
 * for displaying status messages (success, error, partial_success)
 * beneath the page's header, so the title stays the first thing on the
 * page. A page with no `PageHeader` has them above its content instead,
 * from MainLayout.
 *
 * Also ingests flash state from React Router navigation, making it
 * backward-compatible with pages that navigate with `state.flash`.
 *
 * Messages are never auto-dismissed (clinical safety) and are cleared
 * on navigation to a new pathname.
 *
 * @example
 * ```tsx
 * // In an action handler
 * const { showMessage } = usePageMessage();
 * showMessage({ variant: "success", title: "Organisation deleted" });
 *
 * // Flash senders continue to work unchanged
 * navigate("/admin/organisations", {
 *   state: { flash: { variant: "success", title: "Created" } },
 * });
 * ```
 */

/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type PageMessageVariant = "success" | "partial_success" | "error";

export interface PageMessage {
  id: string;
  variant: PageMessageVariant;
  title: string;
  description?: ReactNode;
}

interface PageMessageContextValue {
  messages: PageMessage[];
  showMessage: (msg: Omit<PageMessage, "id">) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  /**
   * The page header showing the messages, or null when the page has
   * none and MainLayout shows them instead.
   */
  headerId: string | null;
  /** Put a page header forward to show the messages; returns the undo. */
  claimHeader: (id: string) => () => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const PageMessageContext = createContext<PageMessageContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function usePageMessage(): PageMessageContextValue {
  const ctx = useContext(PageMessageContext);
  if (!ctx) {
    throw new Error("usePageMessage must be used within PageMessageProvider");
  }
  return ctx;
}

/**
 * Whether the calling page header is the one to show the messages.
 *
 * The first header on the page is. False outside a provider, so a
 * header in a story or a test renders as it always did.
 */
export function usePageMessageSlot(): boolean {
  const ctx = useContext(PageMessageContext);
  const id = useId();
  const claimHeader = ctx?.claimHeader;

  // A layout effect, so a message is never painted above the header
  // and then moved beneath it.
  useLayoutEffect(() => {
    if (!claimHeader) return;
    return claimHeader(id);
  }, [claimHeader, id]);

  return ctx?.headerId === id;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

interface PageMessageProviderProps {
  children: ReactNode;
}

export function PageMessageProvider({ children }: PageMessageProviderProps) {
  const [messages, setMessages] = useState<PageMessage[]>([]);
  // Every page header mounted, in the order they came. The first shows
  // the messages.
  const [headerIds, setHeaderIds] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const prevPathnameRef = useRef(location.pathname);
  const consumedFlashKeyRef = useRef<string | null>(null);

  // Ids only need to be unique within this provider, so a counter will do.
  // Not crypto.randomUUID(): browsers offer it only over HTTPS or on
  // localhost, and a dev app opened at a network address over plain HTTP
  // crashed on the first message.
  const lastIdRef = useRef(0);
  const nextId = useCallback(() => {
    lastIdRef.current += 1;

    return `page-message-${lastIdRef.current}`;
  }, []);

  // Clear all messages on pathname change
  useEffect(() => {
    if (location.pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = location.pathname;
      setMessages([]);
    }
  }, [location.pathname]);

  // Ingest flash state from React Router navigation
  useEffect(() => {
    const state = location.state as {
      flash?: {
        variant?: PageMessageVariant;
        title: string;
        description?: ReactNode;
      };
    } | null;
    const flash = state?.flash;

    if (flash && consumedFlashKeyRef.current !== location.key) {
      // Strict Mode replays the effect before the replacement navigation can
      // commit. Consume each history entry once, not each effect invocation.
      consumedFlashKeyRef.current = location.key;
      const msg: PageMessage = {
        id: nextId(),
        variant: flash.variant ?? "success",
        title: flash.title,
        description: flash.description,
      };
      setMessages((prev) => [...prev, msg]);

      // Remove only flash, retaining the resource fragment and other callers'
      // navigation context. Replace rather than add a history entry.
      const remainingState = { ...state };
      delete remainingState.flash;
      const target = [location.pathname, location.search, location.hash].join("");
      void navigate(target, { replace: true, state: remainingState });
    }
  }, [
    location.key,
    location.state,
    navigate,
    location.pathname,
    location.search,
    location.hash,
    nextId,
  ]);

  const showMessage = useCallback(
    (msg: Omit<PageMessage, "id">) => {
      const newMsg: PageMessage = { ...msg, id: nextId() };
      setMessages((prev) => [...prev, newMsg]);
    },
    [nextId],
  );

  const dismiss = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setMessages([]);
  }, []);

  const claimHeader = useCallback((id: string) => {
    setHeaderIds((prev) => [...prev, id]);
    return () => setHeaderIds((prev) => prev.filter((h) => h !== id));
  }, []);

  return (
    <PageMessageContext.Provider
      value={{
        messages,
        showMessage,
        dismiss,
        clearAll,
        headerId: headerIds[0] ?? null,
        claimHeader,
      }}
    >
      {children}
    </PageMessageContext.Provider>
  );
}
