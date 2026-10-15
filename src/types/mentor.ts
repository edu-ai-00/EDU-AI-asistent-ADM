// Chat mentors — the AI personas students talk to.
//
// These used to be constants in the API, the app and here; they now live in the
// `mentors` table and are edited from /admin/mentors.

/** llm = answered by the LLM using ai_context, rag = answered by the RAG service. */
export type MentorEngine = "llm" | "rag";

/** public = offered in the new-chat list, hidden = only inside its course. */
export type MentorVisibility = "public" | "hidden";

export interface Mentor {
  id: number;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  emoji: string | null;
  /** Picture avatar for the mentor cards; emoji is the fallback. */
  avatar_url: string | null;
  engine: MentorEngine;
  ai_context: string | null;
  rag_legal_entity: string | null;
  /** What a RAG mentor actually searches once the env fallback is applied. */
  rag_legal_entity_effective: string | null;
  /** RAG document-domain filter inside the entity, e.g. ["SECONDARY_ADMISSIONS"]; empty = all. */
  rag_domains: string[];
  visibility: MentorVisibility;
  course_id: number | null;
  course_name: string | null;
  is_active: boolean;
  sort_order: number;
  /** Conversations already using this mentor; null when not counted. */
  session_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MentorInput {
  slug?: string;
  name?: string;
  subtitle?: string | null;
  description?: string | null;
  emoji?: string | null;
  avatar_url?: string | null;
  engine?: MentorEngine;
  ai_context?: string | null;
  rag_legal_entity?: string | null;
  rag_domains?: string[] | null;
  visibility?: MentorVisibility;
  course_id?: number | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface RagEntity {
  code: string;
  name: string;
}

export const ENGINE_LABELS: Record<MentorEngine, string> = {
  llm: "AI model (vlastní kontext)",
  rag: "RAG (dokumenty)",
};

export const VISIBILITY_LABELS: Record<MentorVisibility, string> = {
  public: "Veřejný — ve výpisu nového chatu",
  hidden: "Skrytý — jen pro kurz",
};
