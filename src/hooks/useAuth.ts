"use client";

import { useMemo } from "react";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "teacher";
}

function getUserFromCookie(): AdminUser | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(/(?:^|;\s*)edu-admin-user=([^;]*)/);
  if (!match) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1])) as AdminUser;
  } catch {
    return null;
  }
}

export function useAuth() {
  const user = useMemo(() => getUserFromCookie(), []);

  return {
    user,
    isAdmin: user?.role === "admin",
    isTeacher: user?.role === "teacher",
    isAuthenticated: !!user,
  };
}
