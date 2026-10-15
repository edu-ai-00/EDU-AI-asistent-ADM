// The signed-in staff member, as the login flow wrote them into the
// (non-httpOnly) `edu-admin-user` cookie. Browser-side only — server code
// verifies the identity against the backend instead, see lib/server/auth.ts.

export const USER_COOKIE = "edu-admin-user";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "teacher";
}

export function getSessionUser(): AdminUser | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${USER_COOKIE}=([^;]*)`)
  );
  if (!match) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1])) as AdminUser;
  } catch {
    return null;
  }
}
