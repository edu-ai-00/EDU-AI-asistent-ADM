// Chat types matching the Laravel Chat API

/**
 * A mentor slug. Mentors are rows in the API's `mentors` table now, so this is
 * an open set — an admin can add one without a deploy of this app.
 */
export type ChatPersona = string;

/**
 * Names for the six mentors that predate the mentors table. Used when a
 * session references a mentor the list hasn't loaded (or that was deleted);
 * live names come from /admin/mentors.
 */
export const PERSONA_LABELS: Record<string, string> = {
  ai_teacher: "AI Učitel",
  math_mentor: "Matematický Mentor",
  study_coach: "Studijní Kouč",
  language_mentor: "Jazykový Mentor",
  skolnik: "Školník",
  cermatik: "Cermatík",
};

const PERSONA_COLORS: Record<string, string> = {
  ai_teacher: "bg-blue-100 text-blue-800",
  math_mentor: "bg-green-100 text-green-800",
  study_coach: "bg-amber-100 text-amber-800",
  language_mentor: "bg-purple-100 text-purple-800",
  skolnik: "bg-orange-100 text-orange-800",
  cermatik: "bg-teal-100 text-teal-800",
};

/** Fallback palette for mentors created after this app was built. */
const EXTRA_PERSONA_COLORS = [
  "bg-sky-100 text-sky-800",
  "bg-rose-100 text-rose-800",
  "bg-lime-100 text-lime-800",
  "bg-indigo-100 text-indigo-800",
  "bg-fuchsia-100 text-fuchsia-800",
];

/**
 * Badge colour for a mentor. Unknown slugs get a stable colour derived from the
 * slug, so the same mentor always looks the same across list and detail.
 */
export function personaColor(persona: string): string {
  const known = PERSONA_COLORS[persona];
  if (known) return known;

  let hash = 0;
  for (let i = 0; i < persona.length; i++) {
    hash = (hash * 31 + persona.charCodeAt(i)) % 100000;
  }

  return EXTRA_PERSONA_COLORS[hash % EXTRA_PERSONA_COLORS.length];
}

/**
 * Display name for a mentor: the live name if the mentor list is loaded, the
 * built-in label otherwise, and the raw slug as a last resort.
 */
export function personaLabel(persona: string, names?: Record<string, string>): string {
  return names?.[persona] ?? PERSONA_LABELS[persona] ?? persona;
}

export interface ChatSessionUser {
  id: number;
  name: string;
  email: string;
}

/** Chat session as returned by GET /api/admin/chat/sessions (list) */
export interface ChatSession {
  id: number;
  user: ChatSessionUser;
  title: string;
  persona: ChatPersona;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageMetadata {
  sent_by?: "teacher";
  teacher_id?: number;
  teacher_name?: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  message_type: string;
  metadata: ChatMessageMetadata | null;
  feedback_type: "like" | "dislike" | null;
  feedback_detail: string | null;
  created_at: string;
  updated_at: string;
}

/** Chat session detail as returned by GET /api/admin/chat/sessions/{id} */
export interface ChatSessionDetail {
  id: number;
  user: ChatSessionUser;
  title: string;
  persona: ChatPersona;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface ChatSessionsFilters {
  user_id?: number;
  persona?: ChatPersona;
  classroom_id?: number;
  search?: string;
  page?: number;
}

export interface PaginatedChatSessions {
  sessions: ChatSession[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
