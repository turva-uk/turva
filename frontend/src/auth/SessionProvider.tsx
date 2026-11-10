/**
 * Who is signed in, for the whole application.
 *
 * The session lives on the server, in a cookie Django owns. This provider
 * holds only what the server last told us, and asks it on boot.
 *
 * That is a deliberate change from the frontend this replaces, which cached
 * the user in `localStorage` and trusted it. Two problems with that, and the
 * second is the serious one: the cached copy survives the session expiring, so
 * the interface shows a signed-in user who is not; and `localStorage` is
 * readable by any script on the origin, so a cached clinical safety identity
 * sits there for anything that gets injected. Asking the server costs one
 * request at startup.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { ApiError, api } from "../api/client";
import type { RegistrationInput, Session, User } from "../api/types";
import { SessionContext } from "./sessionContext";
import type { SessionValue } from "./sessionContext";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const read = useCallback(async () => {
    try {
      const session = await api.get<Session>("/auth/session/");
      setUser(session.user);
    } catch {
      // An unreachable API is indistinguishable from being signed out as far
      // as this component can tell, and the login screen is the safe landing
      // place for both.
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Also sets the CSRF cookie, which is what makes the first login POST
    // possible. Without this call the login request would have no token to
    // send and would be refused - and the failure would appear at the login
    // screen rather than here, where the cause is.
    //
    // The rule below is about cascading renders from synchronous setState.
    // Reading the session from the server is the "subscribe to an external
    // system" case it exempts; `setLoading(false)` runs when the answer
    // arrives, not during the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void read().finally(() => setLoading(false));
  }, [read]);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await api.post<Session>("/auth/login/", { email, password });
    setUser(session.user);
    setSignOutError(null);
  }, []);

  const register = useCallback(async (details: RegistrationInput) => {
    const session = await api.post<Session & { confirmation_email_sent: boolean }>(
      "/auth/register/",
      details,
    );
    setUser(session.user);
    setSignOutError(null);
    return session.confirmation_email_sent;
  }, []);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await api.post<Session>("/auth/logout/");
      setUser(null);
    } catch (error) {
      // Never claim a logout succeeded while the server session may still be
      // usable on a shared workstation. Keep the user visible and offer retry.
      setSignOutError(
        error instanceof ApiError
          ? error.message
          : "Could not sign out. Please try again before leaving this computer.",
      );
    } finally {
      setSigningOut(false);
    }
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      loading,
      signIn,
      register,
      signOut,
      signOutError,
      signingOut,
      refresh: read,
    }),
    [user, loading, signIn, register, signOut, signOutError, signingOut, read],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
