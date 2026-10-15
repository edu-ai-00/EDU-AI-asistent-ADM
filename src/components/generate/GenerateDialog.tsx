"use client";

// AI Course Assistant (BR-D4PE8R) — the "Generovat" wizard in the course editor.
//
// upload → mode → running → preview. Nothing reaches the course until the
// author confirms in the preview step, and nothing reaches the server until
// they hit Save in the editor afterwards.

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useGeneration } from "@/hooks/useGeneration";
import { filterDraft, inflateDraft, type InflatedDraft } from "@/lib/generation/inflate";
import type { CourseV2 } from "@/types/block-v2";
import type { GenerationMode } from "@/types/generation";
import { StepMode } from "./StepMode";
import { StepPreview } from "./StepPreview";
import { StepRunning } from "./StepRunning";
import { StepUpload } from "./StepUpload";

interface GenerateDialogProps {
  open: boolean;
  courseV2: CourseV2 | null;
  onClose: () => void;
  onInsert: (fragment: InflatedDraft) => void;
}

const TITLES: Record<string, string> = {
  upload: "Generovat obsah — nahrání podkladů",
  mode: "Generovat obsah — co vytvořit",
  running: "Generovat obsah — probíhá",
  preview: "Generovat obsah — náhled",
};

export function GenerateDialog({ open, courseV2, onClose, onInsert }: GenerateDialogProps) {
  const generation = useGeneration(courseV2?.course_id, courseV2?.name);
  const [mode, setMode] = useState<GenerationMode | null>(null);
  const startedRef = useRef(false);

  const { start, close, step } = generation;

  // Open → issue a session (once). Close → tear it down and wipe the uploads.
  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      void start();
    }

    if (!open && startedRef.current) {
      startedRef.current = false;
      setMode(null);
      close();
    }
  }, [open, start, close]);

  const handleClose = () => {
    // Don't let a stray click discard a run that is already costing tokens.
    if (step === "running") return;
    onClose();
  };

  const handleGenerate = (selected: GenerationMode) => {
    setMode(selected);
    generation.generate(selected);
  };

  const handleInsert = (selection: Set<string>) => {
    if (!generation.draft) return;

    const filtered = filterDraft(generation.draft, selection);
    onInsert(inflateDraft(filtered, courseV2));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={TITLES[step] ?? "Generovat obsah"}
      className="max-w-3xl"
    >
      <div className="space-y-4">
        {generation.error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{generation.error}</span>
          </div>
        )}

        {step === "upload" && (
          <StepUpload
            captureUrl={generation.captureUrl}
            expiresAt={generation.expiresAt}
            attachments={generation.attachments}
            limits={generation.limits}
            isUploading={generation.isUploading || generation.isStarting}
            onUpload={generation.upload}
            onRemove={generation.removeAttachment}
            onContinue={() => generation.setStep("mode")}
          />
        )}

        {step === "mode" && (
          <StepMode
            attachmentCount={generation.attachments.length}
            onBack={() => generation.setStep("upload")}
            onGenerate={handleGenerate}
          />
        )}

        {step === "running" && (
          <StepRunning
            mode={mode}
            progress={generation.progress}
            onCancel={() => generation.setStep("mode")}
          />
        )}

        {step === "preview" && generation.draft && (
          <StepPreview
            draft={generation.draft}
            onBack={() => generation.setStep("mode")}
            onInsert={handleInsert}
          />
        )}
      </div>
    </Dialog>
  );
}
