"use client";

import { useMemo } from "react";
import { getSessionUser, type AdminUser } from "@/lib/auth/session-user";

export type { AdminUser };

export function useAuth() {
  const user = useMemo(() => getSessionUser(), []);

  return {
    user,
    isAdmin: user?.role === "admin",
    isTeacher: user?.role === "teacher",
    isAuthenticated: !!user,
  };
}
