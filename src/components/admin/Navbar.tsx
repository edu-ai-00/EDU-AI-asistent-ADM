"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  Users,
  School,
  UserCog,
  ShieldCheck,
  MessageSquare,
  MessagesSquare,
  Newspaper,
  LogOut,
  Menu,
  X,
  Layers,
  ChevronDown,
  Settings,
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

const primaryItems: NavItem[] = [
  { href: "/admin", label: "Přehled", icon: LayoutDashboard, exact: true },
  { href: "/admin/courses", label: "Kurzy", icon: BookOpen },
  { href: "/admin/users", label: "Studenti", icon: Users },
  { href: "/admin/users?tab=classrooms", label: "Třídy", icon: School },
  { href: "/admin/chats", label: "Chaty", icon: MessagesSquare },
];

const adminSubItems: NavItem[] = [
  { href: "/admin/users?tab=teachers", label: "Učitelé", icon: UserCog, roles: ["admin"] },
  { href: "/admin/users?tab=admins", label: "Admini", icon: ShieldCheck, roles: ["admin"] },
  { href: "/admin/files", label: "Soubory", icon: FolderOpen, roles: ["admin"] },
  { href: "/admin/vectors", label: "Dovednosti", icon: Layers, roles: ["admin"] },
  { href: "/admin/feedback", label: "Zpětná vazba", icon: MessageSquare, roles: ["admin"] },
  { href: "/admin/news", label: "Novinky", icon: Newspaper, roles: ["admin"] },
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
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const visiblePrimary = primaryItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role))
  );
  const visibleSub = adminSubItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role))
  );
  const isSubActive = visibleSub.some((item) => isNavItemActive(item, pathname, searchParams));

  // Close admin menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
    }
    if (adminMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [adminMenuOpen]);

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
              <Image src="/logo.svg" alt="EDU Logo" width={80} height={32} />
            </Link>
          </div>

          {/* Desktop: logo + nav */}
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/admin" className="flex items-center gap-2">
              <Image src="/logo.svg" alt="EDU Logo" width={80} height={32} />
            </Link>
            <nav className="flex space-x-1">
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

              {/* Admin sub-navigation dropdown */}
              {visibleSub.length > 0 && (
                <div className="relative" ref={adminMenuRef}>
                  <button
                    onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium transition-colors rounded-md",
                      isSubActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                    Správa
                    <ChevronDown
                      className={cn(
                        "ml-1 h-3 w-3 transition-transform",
                        adminMenuOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {adminMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 rounded-md border border-border bg-background shadow-md py-1 z-50">
                      {visibleSub.map((item) => {
                        const isActive = isNavItemActive(item, pathname, searchParams);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setAdminMenuOpen(false)}
                            className={cn(
                              "flex items-center px-3 py-2 text-sm font-medium transition-colors",
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
                  )}
                </div>
              )}
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
              {visibleSub.length > 0 && (
                <>
                  <div className="border-t border-border my-1" />
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Správa
                  </div>
                  {visibleSub.map((item) => {
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
