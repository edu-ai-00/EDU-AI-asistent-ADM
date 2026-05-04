// Chat types matching the Laravel Chat API

export type ChatPersona = "ai_teacher" | "math_mentor" | "study_coach" | "language_mentor";

export const PERSONA_LABELS: Record<ChatPersona, string> = {
  ai_teacher: "AI Učitel",
  math_mentor: "Matematický Mentor",
  study_coach: "Studijní Kouč",
  language_mentor: "Jazykový Mentor",
};

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
