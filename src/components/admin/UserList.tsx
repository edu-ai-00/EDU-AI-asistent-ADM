"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import type { UserFilters } from "@/hooks/useUsers";
import { useCourses } from "@/hooks/useCourses";
import { useClassrooms } from "@/hooks/useClassrooms";
import { Input } from "@/components/ui/Input";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { AdminUser } from "@/types/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Nikdy";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Právě teď";
  if (diffMins < 60) return `před ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `před ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `před ${diffDays} d`;
  return date.toLocaleDateString();
}

// ── Sorting ──────────────────────────────────────────────────────────────────

type SortKey =
  | "name"
  | "classroom"
  | "level"
  | "courses"
  | "xp"
  | "last_active";
type SortDir = "asc" | "desc";

// ── Filter types ─────────────────────────────────────────────────────────────

type UserTypeFilter = "all" | "registered" | "guest";

// ── Multi-select dropdown ────────────────────────────────────────────────────

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange(next);
  }

  const count = selected.size;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
          count > 0
            ? "border-blue-300 bg-blue-50 text-blue-700"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        {label}
        {count > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-blue-600 text-white rounded-full">
            {count}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-56 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">Žádné možnosti</div>
          ) : (
            options.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            ))
          )}
          {count > 0 && (
            <button
              onClick={() => onChange(new Set())}
              className="w-full px-3 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-t border-gray-100 text-left"
            >
              Zrušit výběr
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Table components ─────────────────────────────────────────────────────────

function SortIcon({
  active,
  dir,
}: {
  active: boolean;
  dir: SortDir;
}) {
  if (!active) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
  return dir === "asc" ? (
    <ArrowUp className="w-3 h-3 text-blue-600" />
  ) : (
    <ArrowDown className="w-3 h-3 text-blue-600" />
  );
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className={`px-4 py-3 select-none cursor-pointer hover:text-gray-700 transition-colors ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon active={active} dir={currentDir} />
      </span>
    </th>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/admin/users/${user.id}`)}
      className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100"
    >
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-gray-900">
            {user.name}
            {user.is_guest && (
              <span className="ml-1.5 text-xs font-normal text-gray-400">(host)</span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {user.email ?? <span className="italic text-gray-400">bez e-mailu</span>}
            {user.login_code && (
              <span className="ml-2 font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {user.login_code}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center text-sm">
        {user.classroom_name ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {user.classroom_name}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {user.stats?.level ?? 1}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-sm">
        <span className="text-green-600 font-medium">
          {user.completed_count}
        </span>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700">{user.courses_count}</span>
      </td>
      <td className="px-4 py-3 text-center text-sm text-gray-700">
        {user.stats?.xp_points?.toLocaleString() ?? 0}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {formatRelativeTime(user.last_active_at)}
      </td>
    </tr>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  lastPage,
  total,
  onPageChange,
}: {
  page: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <span className="text-sm text-gray-500">
        Celkem {total} uživatel{total === 1 ? "" : total >= 2 && total <= 4 ? "é" : "ů"}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-700">
          {page} / {lastPage}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const VALID_SORT_KEYS: SortKey[] = [
  "name",
  "classroom",
  "level",
  "courses",
  "xp",
  "last_active",
];

export function UserList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── URL-derived state ─────────────────────────────────────────────────────
  const urlSearch = searchParams.get("q") ?? "";
  const sortKeyParam = searchParams.get("sort") as SortKey | null;
  const sortKey: SortKey = sortKeyParam && VALID_SORT_KEYS.includes(sortKeyParam)
    ? sortKeyParam
    : "last_active";
  const sortDir: SortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const userTypeParam = searchParams.get("userType");
  const userType: UserTypeFilter =
    userTypeParam === "registered" || userTypeParam === "guest"
      ? userTypeParam
      : "all";

  const selectedClassrooms = useMemo(() => {
    const raw = searchParams.get("classrooms");
    return new Set(raw ? raw.split(",").filter(Boolean) : []);
  }, [searchParams]);
  const selectedCourses = useMemo(() => {
    const raw = searchParams.get("courses");
    return new Set(raw ? raw.split(",").filter(Boolean) : []);
  }, [searchParams]);

  // Local input state for debounced search typing (URL updates after debounce)
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 300);

  // ── URL update helper ─────────────────────────────────────────────────────
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Sync URL when debounced search changes (typed input)
  useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      updateParams({ q: debouncedSearch || null, page: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync local input if URL changes externally (back/forward nav)
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  // Build the filters object for the API
  const filters: UserFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    classroomIds: selectedClassrooms.size > 0
      ? Array.from(selectedClassrooms).map(Number)
      : undefined,
    courseIds: selectedCourses.size > 0
      ? Array.from(selectedCourses)
      : undefined,
    userType: userType !== "all" ? userType : undefined,
    sort: sortKey,
    dir: sortDir,
    page,
    perPage: 50,
  }), [debouncedSearch, selectedClassrooms, selectedCourses, userType, sortKey, sortDir, page]);

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useUsers(filters);

  const users = data?.users;
  const meta = data?.meta;

  // Load classrooms list for filter dropdown
  const { data: classrooms } = useClassrooms();
  const { data: courses } = useCourses();

  // Setters that write to URL (page reset where appropriate)
  const setSelectedClassrooms = useCallback(
    (next: Set<string>) => {
      updateParams({
        classrooms: next.size ? Array.from(next).join(",") : null,
        page: null,
      });
    },
    [updateParams]
  );
  const setSelectedCourses = useCallback(
    (next: Set<string>) => {
      updateParams({
        courses: next.size ? Array.from(next).join(",") : null,
        page: null,
      });
    },
    [updateParams]
  );
  const setUserType = useCallback(
    (next: UserTypeFilter) => {
      updateParams({ userType: next === "all" ? null : next, page: null });
    },
    [updateParams]
  );
  const setPage = useCallback(
    (next: number) => {
      updateParams({ page: next === 1 ? null : String(next) });
    },
    [updateParams]
  );

  // Derive classroom options from classrooms list (id as value)
  const classroomOptions = useMemo(() => {
    if (!classrooms) return [];
    return classrooms
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "cs"))
      .map((c) => ({ value: String(c.id), label: c.name }));
  }, [classrooms]);

  // Build course options from the courses list
  const courseOptions = useMemo(() => {
    if (!courses) return [];
    return courses
      .map((c) => ({
        value: c.course_id,
        label: `${c.emoji ? c.emoji + " " : ""}${c.name}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "cs"));
  }, [courses]);

  const hasActiveFilters =
    selectedClassrooms.size > 0 ||
    selectedCourses.size > 0 ||
    userType !== "all";

  function clearAllFilters() {
    updateParams({
      classrooms: null,
      courses: null,
      userType: null,
      page: null,
    });
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      updateParams({
        dir: sortDir === "asc" ? "desc" : "asc",
        page: null,
      });
    } else {
      updateParams({ sort: key, dir: "desc", page: null });
    }
  }

  // Only show full-page spinner on initial load (no cached data yet)
  if (isLoading && !data) {
    return <LoadingPage message="Načítání uživatelů..." />;
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">Nepodařilo se načíst uživatele</p>
        <p className="text-sm text-gray-400">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Search + filter bar */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Hledat podle jména nebo e-mailu..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
            {isFetching && (
              <LoadingSpinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>
          <span className="text-sm text-gray-500">
            {meta ? `${meta.total} uživatel${meta.total === 1 ? "" : meta.total >= 2 && meta.total <= 4 ? "é" : "ů"}` : ""}
          </span>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          <MultiSelect
            label="Třída"
            options={classroomOptions}
            selected={selectedClassrooms}
            onChange={setSelectedClassrooms}
          />
          <MultiSelect
            label="Kurz"
            options={courseOptions}
            selected={selectedCourses}
            onChange={setSelectedCourses}
          />

          {/* User type toggle */}
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            {(
              [
                ["all", "Všichni"],
                ["registered", "Registrovaní"],
                ["guest", "Hosté"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setUserType(value)}
                className={`px-3 py-2 transition-colors ${
                  userType === value
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-2 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Zrušit filtry
            </button>
          )}
        </div>
      </div>

      {!users || users.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          {searchInput || hasActiveFilters ? (
            <p className="text-gray-600">
              Žádní uživatelé neodpovídají filtrům
            </p>
          ) : (
            <p className="text-gray-600">
              Zatím žádní registrovaní uživatelé
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortableHeader
                  label="Uživatel"
                  sortKey="name"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Třída"
                  sortKey="classroom"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="text-center"
                />
                <SortableHeader
                  label="Úroveň"
                  sortKey="level"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="text-center"
                />
                <SortableHeader
                  label="Kurzy"
                  sortKey="courses"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="text-center"
                />
                <SortableHeader
                  label="XP"
                  sortKey="xp"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="text-center"
                />
                <SortableHeader
                  label="Poslední aktivita"
                  sortKey="last_active"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </tbody>
          </table>

          {meta && (
            <Pagination
              page={meta.page}
              lastPage={meta.last_page}
              total={meta.total}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
