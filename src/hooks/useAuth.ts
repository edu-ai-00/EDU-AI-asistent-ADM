"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getSessionUser, type AdminUser } from "@/lib/auth/session-user";

export type { AdminUser };

// Nothing to listen to: the hook only needs to know whether hydration is over.
const subscribe = () => () => {};

export function useAuth() {
  // The user cookie is readable only in the browser, so the server renders
  // every page signed out. Hydration has to start from that same output, or a
  // full load of any page that branches on the role (the Navbar on every
  // dynamic route, the Chaty notice…) ends in a hydration error (BR-QPFPDW).
  // React hydrates with the server snapshot (false) and re-renders with the
  // client one (true) straight after; a client-side navigation mounts with
  // true at once, so it still reads the cookie on the first render.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const user = useMemo(() => (hydrated ? getSessionUser() : null), [hydrated]);

  return {
    user,
    isAdmin: user?.role === "admin",
    isTeacher: user?.role === "teacher",
    isAuthenticated: !!user,
  };
}
