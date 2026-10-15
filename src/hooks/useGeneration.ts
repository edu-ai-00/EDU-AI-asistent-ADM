"use client";

// AI Course Assistant (BR-D4PE8R) — wizard state machine.
//
// Owns the capture session, the attachment list (which the phone can grow
// behind our back, hence the poll) and the SSE generation run.

import { useCallback, useEffect, useRef, useState } from "react";
import { generationApi } from "@/lib/api/generation";
import type {
  CourseDraft,
  GenerationAttachment,
  GenerationEvent,
  GenerationLimits,
  GenerationMode,
} from "@/types/generation";

export type WizardStep = "upload" | "mode" | "running" | "preview";

const POLL_INTERVAL_MS = 3000;

interface Progress {
  stage: "ocr" | "generate";
  chars: number;
}

export function useGeneration(courseId?: string, courseName?: string) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [token, setToken] = useState<string | null>(null);
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [limits, setLimits] = useState<GenerationLimits | null>(null);
  const [attachments, setAttachments] = useState<GenerationAttachment[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const sourceRef = useRef<EventSource | null>(null);
  const tokenRef = useRef<string | null>(null);

  // Keep a ref alongside the state so cleanup can close the session without
  // re-running the effect every time the token changes.
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const start = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    try {
      const session = await generationApi.createSession(courseId, courseName);
      setToken(session.token);
      setCaptureUrl(session.capture_url);
      setExpiresAt(session.expires_at);
      setLimits(session.limits);
      setAttachments(session.attachments ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nepodařilo se zahájit generování.");
    } finally {
      setIsStarting(false);
    }
  }, [courseId, courseName]);

  // Poll while collecting so photos taken on the phone show up on the desktop.
  useEffect(() => {
    if (!token || step !== "upload") return;

    let cancelled = false;

    const id = setInterval(async () => {
      try {
        const session = await generationApi.getSession(token);
        if (!cancelled) setAttachments(session.attachments ?? []);
      } catch {
        // A dropped poll is not worth surfacing; the next tick retries.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, step]);

  const upload = useCallback(
    async (files: File[]) => {
      if (!token || files.length === 0) return;
      setIsUploading(true);
      setError(null);
      try {
        const session = await generationApi.uploadFiles(token, files);
        setAttachments(session.attachments ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Nahrání se nezdařilo.");
      } finally {
        setIsUploading(false);
      }
    },
    [token]
  );

  const removeAttachment = useCallback(
    async (index: number) => {
      if (!token) return;
      try {
        const session = await generationApi.removeAttachment(token, index);
        setAttachments(session.attachments ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Přílohu se nepodařilo odebrat.");
      }
    },
    [token]
  );

  const generate = useCallback(
    (mode: GenerationMode) => {
      if (!token) return;

      setStep("running");
      setError(null);
      setDraft(null);
      setProgress({ stage: "ocr", chars: 0 });

      const source = new EventSource(generationApi.streamUrl(token, mode));
      sourceRef.current = source;

      const finish = () => {
        source.close();
        sourceRef.current = null;
      };

      source.onmessage = (event) => {
        // The stream ends with a literal [DONE]; without closing here,
        // EventSource would reconnect and re-trigger the whole run.
        if (event.data === "[DONE]") {
          finish();
          return;
        }

        let payload: GenerationEvent;
        try {
          payload = JSON.parse(event.data) as GenerationEvent;
        } catch {
          return;
        }

        if (payload.stage === "error") {
          setError(payload.error);
          setStep("mode");
          finish();
          return;
        }

        if (payload.stage === "result") {
          setDraft(payload.result);
          setStep("preview");
          return;
        }

        if ("token" in payload) {
          const chunk = payload.token;
          setProgress((prev) =>
            prev && prev.stage === payload.stage
              ? { stage: payload.stage, chars: prev.chars + chunk.length }
              : { stage: payload.stage, chars: chunk.length }
          );
          return;
        }

        if (payload.status === "start") {
          setProgress({ stage: payload.stage, chars: 0 });
        }
      };

      source.onerror = () => {
        // Fires both on a real failure and on the normal end-of-stream close.
        // Only the former leaves us without a result.
        if (sourceRef.current) {
          finish();
          setError("Spojení se serverem se přerušilo. Zkuste to znovu.");
          setStep("mode");
        }
      };
    },
    [token]
  );

  /** Close the session and wipe its uploads; safe to call more than once. */
  const close = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;

    const current = tokenRef.current;
    tokenRef.current = null;

    if (current) {
      void generationApi.closeSession(current).catch(() => {
        // Expired sessions clean themselves up server-side.
      });
    }

    setToken(null);
    setCaptureUrl(null);
    setExpiresAt(null);
    setAttachments([]);
    setDraft(null);
    setProgress(null);
    setError(null);
    setStep("upload");
  }, []);

  // Never leave an open stream or an orphaned session behind on unmount.
  useEffect(() => {
    return () => {
      sourceRef.current?.close();
      const current = tokenRef.current;
      if (current) {
        void generationApi.closeSession(current).catch(() => {});
      }
    };
  }, []);

  return {
    step,
    setStep,
    token,
    captureUrl,
    expiresAt,
    limits,
    attachments,
    progress,
    draft,
    error,
    setError,
    isStarting,
    isUploading,
    start,
    upload,
    removeAttachment,
    generate,
    close,
  };
}
