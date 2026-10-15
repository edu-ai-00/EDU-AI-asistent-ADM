// AI Course Assistant (BR-D4PE8R) — types shared by the wizard and the API.
//
// The backend returns a deliberately thin *draft*: only content a model can
// actually know about. Everything else (ids, GPF, FSRS, learning metadata)
// is filled in client-side from `@/lib/defaults`, so those defaults have
// exactly one home. See `@/lib/generation/inflate`.

import type { QuestionType } from "./block-v2";

export type GenerationMode = "ocr" | "full";

export type GenerationStatus = "collecting" | "generating" | "done" | "failed";

// ============================================================================
// Draft shape returned by the API
// ============================================================================

export interface DraftOption {
  id: string;
  text: string;
  is_correct: boolean;
  feedback?: string;
}

export interface DraftQuestion {
  type: QuestionType;
  options?: DraftOption[];
  correct_answer?: string;
  correct_number?: number;
  tolerance?: number;
  solution?: string;
  show_answers?: boolean;
}

export interface DraftStep {
  type: "text" | "question";
  content: string;
  hint?: string;
  help?: string;
  question?: DraftQuestion;
}

export interface DraftBlock {
  type: "display" | "question" | "exercise";
  steps: DraftStep[];
  concepts: string[];
  difficulty: number;
  bloom_level: number;
}

export interface DraftLesson {
  name: string;
  description: string;
  blocks: DraftBlock[];
}

export interface CourseDraft {
  lessons: DraftLesson[];
}

// ============================================================================
// Session
// ============================================================================

export interface GenerationAttachment {
  filename: string;
  mime_type: string;
  size: number;
  uploaded_at: string | null;
}

export interface GenerationLimits {
  max_attachments: number;
  max_file_bytes: number;
  allowed_mimes: string[];
}

export interface GenerationSession {
  status: GenerationStatus;
  mode: GenerationMode | null;
  course_id: string | null;
  course_name: string | null;
  expires_at: string;
  error: string | null;
  attachments: GenerationAttachment[];
}

export interface NewGenerationSession extends GenerationSession {
  token: string;
  capture_url: string;
  limits: GenerationLimits;
}

// ============================================================================
// SSE events
// ============================================================================

export type GenerationEvent =
  | { stage: "ocr" | "generate"; status: "start" | "done" }
  | { stage: "ocr" | "generate"; token: string }
  | { stage: "result"; result: CourseDraft }
  | { stage: "error"; error: string };
