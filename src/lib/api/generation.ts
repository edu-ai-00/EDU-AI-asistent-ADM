// AI Course Assistant (BR-D4PE8R) — admin-side API calls.
//
// Everything here goes through the authenticated /api/backend proxy. The phone
// capture page uses /api/capture instead, which is deliberately unauthenticated.

import { api } from "./client";
import type {
  GenerationMode,
  GenerationSession,
  NewGenerationSession,
} from "@/types/generation";

export const generationApi = {
  createSession(courseId?: string, courseName?: string): Promise<NewGenerationSession> {
    return api.post<NewGenerationSession>("admin/generation/sessions", {
      course_id: courseId ?? null,
      course_name: courseName ?? null,
    });
  },

  getSession(token: string): Promise<GenerationSession> {
    return api.get<GenerationSession>(`admin/generation/sessions/${token}`);
  },

  uploadFiles(token: string, files: File[]): Promise<GenerationSession> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files[]", file));
    return api.uploadFormData<GenerationSession>(
      `admin/generation/sessions/${token}/attachments`,
      formData
    );
  },

  removeAttachment(token: string, index: number): Promise<GenerationSession> {
    return api.delete<GenerationSession>(
      `admin/generation/sessions/${token}/attachments/${index}`
    );
  },

  closeSession(token: string): Promise<unknown> {
    return api.delete(`admin/generation/sessions/${token}`);
  },

  /**
   * SSE endpoint. Same-origin, so EventSource sends the session cookie and the
   * proxy can inject the bearer token server-side.
   */
  streamUrl(token: string, mode: GenerationMode): string {
    return `/api/backend/admin/generation/sessions/${token}/stream?mode=${mode}`;
  },
};
