"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Bot,
} from "lucide-react";
import { useChatSessions } from "@/hooks/useChat";
import { useClassrooms } from "@/hooks/useClassrooms";
import { Input } from "@/components/ui/Input";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PERSONA_LABELS } from "@/types/chat";
import type { ChatSession, ChatPersona, ChatSessionsFilters } from "@/types/chat";

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
  return date.toLocaleDateString("cs");
}

const PERSONA_COLORS: Record<ChatPersona, string> = {
  ai_teacher: "bg-blue-100 text-blue-800",
  math_mentor: "bg-green-100 text-green-800",
  study_coach: "bg-amber-100 text-amber-800",
  language_mentor: "bg-purple-100 text-purple-800",
};

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

// ── Session row ──────────────────────────────────────────────────────────────

function SessionRow({ session }: { session: ChatSession }) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/admin/chats/${session.id}`)}
      className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100"
    >
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-gray-900">{session.user.name}</div>
          {session.user.email && (
            <div className="text-sm text-gray-500">{session.user.email}</div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center w-44">
        <span className={`inline-flex items-center justify-center gap-1 w-full px-2 py-0.5 rounded-full text-xs font-medium ${PERSONA_COLORS[session.persona]}`}>
          <Bot className="w-3 h-3" />
          {PERSONA_LABELS[session.persona]}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-sm text-gray-700 w-20">
        {session.message_count}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 w-36">
        {formatRelativeTime(session.last_message_at)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 w-40">
        {new Date(session.created_at).toLocaleString("cs", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
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
        Celkem {total} chat{total === 1 ? "" : total >= 2 && total <= 4 ? "y" : "ů"}
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

export function ChatList() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(1);
  const [selectedPersona, setSelectedPersona] = useState<Set<string>>(new Set());
  const [selectedClassrooms, setSelectedClassrooms] = useState<Set<string>>(new Set());

  const filters: ChatSessionsFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    persona: selectedPersona.size === 1
      ? (Array.from(selectedPersona)[0] as ChatPersona)
      : undefined,
    classroom_id: selectedClassrooms.size === 1
      ? Number(Array.from(selectedClassrooms)[0])
      : undefined,
    page,
  }), [debouncedSearch, selectedPersona, selectedClassrooms, page]);

  const { data, isLoading, isFetching, error } = useChatSessions(filters);

  const sessions = data?.sessions;
  const meta = data?.meta;

  const { data: classrooms } = useClassrooms();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedPersona, selectedClassrooms]);

  const classroomOptions = useMemo(() => {
    if (!classrooms) return [];
    return classrooms
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "cs"))
      .map((c) => ({ value: String(c.id), label: c.name }));
  }, [classrooms]);

  const personaOptions = useMemo(
    () =>
      (Object.entries(PERSONA_LABELS) as [string, string][]).map(([value, label]) => ({
        value,
        label,
      })),
    []
  );

  const hasActiveFilters = selectedPersona.size > 0 || selectedClassrooms.size > 0;

  function clearAllFilters() {
    setSelectedPersona(new Set());
    setSelectedClassrooms(new Set());
  }

  if (isLoading && !data) {
    return <LoadingPage message="Načítání chatů..." />;
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">Nepodařilo se načíst chaty</p>
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
              placeholder="Hledat v názvech chatů..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {isFetching && (
              <LoadingSpinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>
          <span className="text-sm text-gray-500">
            {meta ? `${meta.total} chat${meta.total === 1 ? "" : meta.total >= 2 && meta.total <= 4 ? "y" : "ů"}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <MultiSelect
            label="Persona"
            options={personaOptions}
            selected={selectedPersona}
            onChange={setSelectedPersona}
          />
          <MultiSelect
            label="Třída"
            options={classroomOptions}
            selected={selectedClassrooms}
            onChange={setSelectedClassrooms}
          />

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

      {!sessions || sessions.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          {searchQuery || hasActiveFilters ? (
            <p className="text-gray-600">Žádné chaty neodpovídají filtrům</p>
          ) : (
            <p className="text-gray-600">Zatím žádné chatové relace</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Uživatel</th>
                <th className="px-4 py-3 text-center w-44">Persona</th>
                <th className="px-4 py-3 text-center w-20">Zprávy</th>
                <th className="px-4 py-3 w-36">Poslední zpráva</th>
                <th className="px-4 py-3 w-40">Vytvořeno</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </tbody>
          </table>

          {meta && (
            <Pagination
              page={meta.current_page}
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
