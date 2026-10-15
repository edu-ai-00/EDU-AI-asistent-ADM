"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  Users,
  School,
  Building2,
  UserCog,
  ShieldCheck,
  MessageSquare,
  MessagesSquare,
  Bot,
  Newspaper,
  Shirt,
  LogOut,
  Menu,
  X,
  Layers,
  ChevronDown,
  Settings,
  Baby,
  GraduationCap,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** If set, only these roles see the item. Omit = visible to all. */
  roles?: ("admin" | "teacher")[];
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

// Only the two everyday destinations stay on the bar. Everything else lives in
// a group: the bar had grown to nine top-level items and no longer fitted the
// 920px header, so the labels wrapped and ran into the user name (BR-CH9E3C).
const primaryItems: NavItem[] = [
  { href: "/admin", label: "Přehled", icon: LayoutDashboard, exact: true },
  { href: "/admin/courses", label: "Kurzy", icon: BookOpen },
];

// Everything about who is learning and how they are doing. The first four are
// tabs of the single /admin/users page, which has no tab bar of its own, so
// this group is also the only way to reach them.
const schoolItems: NavItem[] = [
  { href: "/admin/users", label: "Studenti", icon: Users },
  { href: "/admin/users?tab=classrooms", label: "Třídy", icon: School },
  // Managing teachers belongs beside students and classes — it is everyday
  // school admin, not configuration. It used to sit under "Správa", where
  // nobody found it (BR-38FYMX). "Admini" stays there: rarely touched.
  { href: "/admin/users?tab=teachers", label: "Učitelé", icon: UserCog, roles: ["admin"] },
  // Daily per-student activity overview (BR-AT7X2T); teachers see their own
  // classes only, scoped server-side.
  { href: "/admin/users?tab=activity", label: "Aktivita", icon: Activity },
  // A pupil's chats are for the admin (and one day their mentor), not for
  // whoever teaches their class — the API refuses a teacher too (BR-4KPUJQ).
  { href: "/admin/chats", label: "Chaty", icon: MessagesSquare, roles: ["admin"] },
];

const adminSubItems: NavItem[] = [
  { href: "/admin/users?tab=admins", label: "Admini", icon: ShieldCheck, roles: ["admin"] },
  // The client wants schools here, not under "Škola" beside classes, where
  // BR-8QAWKP had put them (BR-HABQT7). Admin-only — it is an admin decision.
  { href: "/admin/users?tab=schools", label: "Školy", icon: Building2, roles: ["admin"] },
  // Who changed what, across classes, schools, users, courses and consents
  // (BR-BNNASY). Admin-only on the API, so teachers do not see it here either.
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText, roles: ["admin"] },
  // Mentors are the AI personas behind the chats — set up once and left alone,
  // so they belong with the rest of the configuration (BR-CH9E3C).
  { href: "/admin/mentors", label: "Mentoři", icon: Bot, roles: ["admin"] },
  { href: "/admin/files", label: "Soubory", icon: FolderOpen, roles: ["admin"] },
  { href: "/admin/vectors", label: "Dovednosti", icon: Layers, roles: ["admin"] },
  { href: "/admin/feedback", label: "Zpětná vazba", icon: MessageSquare, roles: ["admin"] },
  { href: "/admin/news", label: "Novinky", icon: Newspaper, roles: ["admin"] },
  { href: "/admin/avatar", label: "Avatar", icon: Shirt, roles: ["admin"] },
  { href: "/admin/self-service", label: "Samoobsluha", icon: Baby, roles: ["admin"] },
];

const navGroups: NavGroup[] = [
  { label: "Škola", icon: GraduationCap, items: schoolItems },
  { label: "Správa", icon: Settings, items: adminSubItems },
];

function isNavItemActive(item: NavItem, pathname: string, searchParams: URLSearchParams): boolean {
  const url = new URL(item.href, "http://x");
  const itemPath = url.pathname;
  const itemTab = url.searchParams.get("tab");

  if (item.exact) return pathname === itemPath && !itemTab;

  if (!pathname.startsWith(itemPath)) return false;

  // If the nav item has a ?tab= param, match it
  if (itemTab) return searchParams.get("tab") === itemTab;

  // If the nav item has no ?tab= param but the URL does, don't match
  // (e.g. /admin/users should not be active when ?tab=classrooms)
  if (pathname === itemPath && searchParams.has("tab")) return false;

  return true;
}

export function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Which group dropdown is open, by label — at most one at a time.
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const isVisible = (item: NavItem) =>
    !item.roles || (user?.role && item.roles.includes(user.role));

  const visiblePrimary = primaryItems.filter(isVisible);
  // Drop a group the current role sees nothing in — a teacher has no "Správa".
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter(isVisible) }))
    .filter((group) => group.items.length > 0);

  // Close the open dropdown when clicking outside the nav.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    if (openGroup) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openGroup]);

  // Most items only differ by ?tab=, so the route change alone has to close the
  // dropdown — clicking a link inside it does not always unmount anything.
  const searchKey = searchParams.toString();
  useEffect(() => {
    setOpenGroup(null);
  }, [pathname, searchKey]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const roleBadge = user ? (
    <span
      className={cn(
        "text-xs px-1.5 py-0.5 rounded font-medium",
        isAdmin
          ? "bg-purple-100 text-purple-700"
          : "bg-blue-100 text-blue-700"
      )}
    >
      {user.role}
    </span>
  ) : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-[920px] px-4">
        <div className="flex h-14 items-center justify-between border-x border-border px-4">
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-9 w-9 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <Link href="/admin" className="flex items-center gap-2">
              <Image src="/logo.svg" alt="EDU Logo" width={80} height={23} />
            </Link>
          </div>

          {/* Desktop: logo + nav */}
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/admin" className="flex items-center gap-2">
              <Image src="/logo.svg" alt="EDU Logo" width={80} height={23} />
            </Link>
            <nav className="flex space-x-1" ref={navRef}>
              {visiblePrimary.map((item) => {
                const isActive = isNavItemActive(item, pathname, searchParams);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium transition-colors rounded-md",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}

              {/* Grouped sections, one dropdown each */}
              {visibleGroups.map((group) => {
                const isOpen = openGroup === group.label;
                const isActive = group.items.some((item) =>
                  isNavItemActive(item, pathname, searchParams)
                );
                const GroupIcon = group.icon;

                return (
                  <div key={group.label} className="relative">
                    <button
                      onClick={() => setOpenGroup(isOpen ? null : group.label)}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium transition-colors rounded-md",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <GroupIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {group.label}
                      <ChevronDown
                        className={cn(
                          "ml-1 h-3 w-3 transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 rounded-md border border-border bg-background shadow-md py-1 z-50">
                        {group.items.map((item) => {
                          const isItemActive = isNavItemActive(item, pathname, searchParams);
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setOpenGroup(null)}
                              className={cn(
                                "flex items-center px-3 py-2 text-sm font-medium transition-colors",
                                isItemActive
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                              )}
                            >
                              <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Right side: user info + logout */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="max-w-[120px] truncate">{user.name || user.email}</span>
                {roleBadge}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-9 w-9 transition-colors"
              title="Odhlásit"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border">
          <div className="container mx-auto max-w-[920px] px-4">
            <div className="border-x border-border px-4 py-2 space-y-1">
              {user && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <span>{user.name || user.email}</span>
                  {roleBadge}
                </div>
              )}
              {visiblePrimary.map((item) => {
                const isActive = isNavItemActive(item, pathname, searchParams);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium transition-colors rounded-md",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
              {visibleGroups.map((group) => (
                <div key={group.label}>
                  <div className="border-t border-border my-1" />
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const isActive = isNavItemActive(item, pathname, searchParams);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center px-3 py-2 pl-6 text-sm font-medium transition-colors rounded-md",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
