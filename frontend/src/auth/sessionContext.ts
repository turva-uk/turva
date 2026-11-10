import { createContext } from "react";

import type { User } from "../api/types";

export interface SessionValue {
  user: User | null;
  /** True until the first `auth/session/` call resolves. Rendering routes
   *  before this settles would flash the login screen at a signed-in user. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-read the user after a profile change, so the header and the CSO
   *  status do not go stale. */
  refresh: () => Promise<void>;
}

/**
 * In its own module, holding no component, so that `SessionProvider.tsx`
 * exports only a component and React Fast Refresh can replace it during
 * development without losing state.
 */
export const SessionContext = createContext<SessionValue | null>(null);
