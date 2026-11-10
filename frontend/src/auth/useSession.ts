import { use } from "react";

import { SessionContext } from "./sessionContext";
import type { SessionValue } from "./sessionContext";

/** The signed-in user, and the operations that change who that is. */
export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (value === null) {
    throw new Error("useSession must be used inside a SessionProvider");
  }
  return value;
}
