"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Loader2, User as UserIcon, Mail, Hash, GraduationCap, Shield } from "lucide-react";
import { useDebounce } from "use-debounce";
import { useUsers } from "@/hooks/useUsers";
import type { AdminUser } from "@/types/api";

interface UserSearchPickerProps {
  label: string;
  value: AdminUser | null;
  onChange: (user: AdminUser | null) => void;
  // ID to disable in dropdown (e.g. the user already picked on the other side).
  excludeId?: number | null;
  placeholder?: string;
  autoFocus?: boolean;
}

function relativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "Nikdy";
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Právě teď";
  if (diffMins < 60) return `před ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `před ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `před ${diffDays} d`;
  return date.toLocaleDateString();
}

function roleIcon(role: AdminUser["role"]) {
  if (role === "admin") return <Shield className="w-4 h-4 text-purple-500" />;
  if (role === "teacher") return <GraduationCap className="w-4 h-4 text-blue-500" />;
  return <UserIcon className="w-4 h-4 text-gray-400" />;
}

function avatarPlaceholder(user: AdminUser) {
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
      {initials || "?"}
    </div>
  );
}

export function UserSearchPicker({
  label,
  value,
  onChange,
  excludeId = null,
  placeholder = "Hledat podle jména, e-mailu nebo PINu...",
  autoFocus = false,
}: UserSearchPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useUsers({
    search: debouncedQuery || undefined,
    perPage: 20,
    userType: "all",
  });

  const results = useMemo(() => {
    if (!data?.users) return [];
    if (excludeId == null) return data.users;
    return data.users.filter((u) => u.id !== excludeId);
  }, [data, excludeId]);

  // Close dropdown on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(user: AdminUser) {
    onChange(user);
    setQuery("");
    setOpen(false);
  }

  function handleReset() {
    onChange(null);
    setQuery("");
    setOpen(false);
  }

  // ── Selected state: show user card with reset button ─────────────────────
  if (value) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {label}
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-3 h-3" />
            Změnit
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-start gap-3">
            {avatarPlaceholder(value)}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {roleIcon(value.role)}
                <div className="font-medium text-gray-900 truncate">
                  {value.name}
                  {value.is_guest && (
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      (host)
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-1 space-y-0.5 text-sm">
                {value.email ? (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Mail className="w-3 h-3 text-gray-400" />
                    <span className="truncate">{value.email}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-gray-400 italic">
                    <Mail className="w-3 h-3" />
                    bez e-mailu
                  </div>
                )}
                {value.login_code && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Hash className="w-3 h-3 text-gray-400" />
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {value.login_code}
                    </span>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  ID #{value.id}
                  {value.classroom_name && (
                    <>
                      {" • "}
                      <span className="text-purple-700">{value.classroom_name}</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  Aktivita: {relativeTime(value.last_active_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state: search input with dropdown ──────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="px-3 py-2 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
        </div>
      </div>

      {open && debouncedQuery && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {isFetching && results.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">
              Hledání...
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">
              Žádní uživatelé neodpovídají hledání
            </div>
          ) : (
            results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer text-left border-b border-gray-50 last:border-b-0"
              >
                {roleIcon(user.role)}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                    {user.is_guest && (
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        (host)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <span className="truncate">
                      {user.email || (
                        <span className="italic text-gray-400">bez e-mailu</span>
                      )}
                    </span>
                    {user.login_code && (
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {user.login_code}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">ID #{user.id}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
