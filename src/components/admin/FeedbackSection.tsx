"use client";

import { useState } from "react";
import { ArrowLeft, AlertCircle, MessageCircleQuestion, ThumbsUp, ThumbsDown, Check, Minus } from "lucide-react";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { useFeedback } from "@/hooks/useFeedback";
import type { ContentFeedback } from "@/types/feedback";

// ---------------------------------------------------------------------------
// Type badge helpers
// ---------------------------------------------------------------------------

const TYPE_CONFIG = {
  question: {
    label: "Otázka",
    icon: MessageCircleQuestion,
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  like: {
    label: "Líbí se",
    icon: ThumbsUp,
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  dislike: {
    label: "Nelíbí se",
    icon: ThumbsDown,
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
} as const;

function TypeBadge({ type }: { type: ContentFeedback["type"] }) {
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = [
  { value: "", label: "Vše" },
  { value: "question", label: "Otázky" },
  { value: "like", label: "Líbí se" },
  { value: "dislike", label: "Nelíbí se" },
] as const;

function FilterBar({
  courseId,
  onCourseIdChange,
  type,
  onTypeChange,
}: {
  courseId: string;
  onCourseIdChange: (v: string) => void;
  type: string;
  onTypeChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <input
        type="text"
        placeholder="Filtrovat dle kurzu (course_id)..."
        value={courseId}
        onChange={(e) => onCourseIdChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
      />
      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeedbackList
// ---------------------------------------------------------------------------

function FeedbackList({
  items,
  onSelect,
}: {
  items: ContentFeedback[];
  onSelect: (item: ContentFeedback) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <MessageCircleQuestion className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">Zatím žádná zpětná vazba</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        Celkem: {items.length} záznamů
      </p>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Uživatel</th>
              <th className="px-4 py-3">Kurz</th>
              <th className="px-4 py-3">Zpráva</th>
              <th className="px-4 py-3">Datum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelect(item)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5">
                  <TypeBadge type={item.type} />
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-900">
                  {item.user.name}
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-sm text-gray-600 font-mono">{item.course_id}</div>
                  {item.block_id && (
                    <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 font-mono">
                      {item.block_id}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {item.message ? (
                    <Check className="w-4 h-4 text-green-600 inline-block" />
                  ) : (
                    <Minus className="w-4 h-4 text-gray-300 inline-block" />
                  )}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">
                  {new Date(item.created_at).toLocaleDateString("cs-CZ", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeedbackDetail
// ---------------------------------------------------------------------------

function FeedbackDetail({
  item,
  onBack,
}: {
  item: ContentFeedback;
  onBack: () => void;
}) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Detail zpětné vazby
          </h2>
          <p className="text-sm text-gray-500">#{item.id}</p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        <Row label="Typ">
          <TypeBadge type={item.type} />
        </Row>
        <Row label="Uživatel">
          <span className="text-gray-900">{item.user.name}</span>
          <span className="text-gray-500 ml-2 text-sm">
            ({item.user.email})
          </span>
        </Row>
        <Row label="Kurz">
          <span className="font-mono text-gray-900">{item.course_id}</span>
        </Row>
        <Row label="Blok">
          <span className="font-mono text-gray-900">{item.block_id}</span>
        </Row>
        {item.lesson_id && (
          <Row label="Lekce">
            <span className="font-mono text-gray-900">{item.lesson_id}</span>
          </Row>
        )}
        <Row label="Datum">
          <span className="text-gray-900">
            {new Date(item.created_at).toLocaleString("cs-CZ", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </Row>
        {item.message && (
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Zpráva
            </div>
            <p className="text-gray-900 whitespace-pre-wrap">{item.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider w-24 shrink-0">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeedbackSection (exported orchestrator)
// ---------------------------------------------------------------------------

export function FeedbackSection() {
  const [selectedItem, setSelectedItem] = useState<ContentFeedback | null>(
    null
  );
  const [courseFilter, setCourseFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Debounce course_id filter — only send when user stops typing
  const [debouncedCourse, setDebouncedCourse] = useState("");
  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleCourseChange(value: string) {
    setCourseFilter(value);
    if (debounceRef[0]) clearTimeout(debounceRef[0]);
    debounceRef[0] = setTimeout(() => setDebouncedCourse(value), 400);
  }

  const { data, isLoading, error } = useFeedback(
    debouncedCourse || undefined,
    typeFilter || undefined
  );

  if (selectedItem) {
    return (
      <FeedbackDetail item={selectedItem} onBack={() => setSelectedItem(null)} />
    );
  }

  if (isLoading) {
    return <LoadingPage message="Načítání zpětné vazby..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">Nepodařilo se načíst zpětnou vazbu</p>
      </div>
    );
  }

  return (
    <div>
      <FilterBar
        courseId={courseFilter}
        onCourseIdChange={handleCourseChange}
        type={typeFilter}
        onTypeChange={setTypeFilter}
      />
      <FeedbackList items={data ?? []} onSelect={setSelectedItem} />
    </div>
  );
}
