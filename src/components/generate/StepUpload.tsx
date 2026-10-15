"use client";

// AI Course Assistant (BR-D4PE8R) — step 1: collect photos and PDFs.

import { useCallback, useRef } from "react";
import { FileText, ImageIcon, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QrPanel } from "./QrPanel";
import type { GenerationAttachment, GenerationLimits } from "@/types/generation";

interface StepUploadProps {
  captureUrl: string | null;
  expiresAt: string | null;
  attachments: GenerationAttachment[];
  limits: GenerationLimits | null;
  isUploading: boolean;
  onUpload: (files: File[]) => void;
  onRemove: (index: number) => void;
  onContinue: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function StepUpload({
  captureUrl,
  expiresAt,
  attachments,
  limits,
  isUploading,
  onUpload,
  onRemove,
  onContinue,
}: StepUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const maxAttachments = limits?.max_attachments ?? 10;
  const maxMb = Math.round((limits?.max_file_bytes ?? 15728640) / 1024 / 1024);
  const isFull = attachments.length >= maxAttachments;

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      onUpload(Array.from(fileList));
    },
    [onUpload]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div
          onDrop={(e) => {
            e.preventDefault();
            if (!isFull) handleFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
            isFull
              ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
              : "cursor-pointer border-gray-300 hover:border-blue-500"
          }`}
          onClick={() => !isFull && inputRef.current?.click()}
        >
          <Upload className="h-10 w-10 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            Přetáhněte fotky nebo PDF, nebo klikněte
          </p>
          <p className="text-xs text-gray-500">
            JPG, PNG, WEBP, PDF · max {maxMb} MB na soubor · max {maxAttachments} příloh
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              // Allow re-picking the same file after a removal.
              e.target.value = "";
            }}
          />
        </div>

        {captureUrl ? (
          <QrPanel captureUrl={captureUrl} expiresAt={expiresAt} />
        ) : (
          <div className="h-full animate-pulse rounded-lg bg-gray-100" />
        )}
      </div>

      {isUploading && <p className="text-sm text-gray-500">Nahrávám…</p>}

      {attachments.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {attachments.map((attachment, index) => (
            <li
              key={`${attachment.filename}-${index}`}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              {attachment.mime_type === "application/pdf" ? (
                <FileText className="h-4 w-4 shrink-0 text-red-500" />
              ) : (
                <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
              )}
              <span className="flex-1 truncate text-gray-700">{attachment.filename}</span>
              <span className="shrink-0 text-xs text-gray-400">
                {formatSize(attachment.size)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Odebrat ${attachment.filename}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-gray-500">
          {attachments.length} z {maxAttachments} příloh
        </p>
        <Button onClick={onContinue} disabled={attachments.length === 0}>
          Pokračovat
        </Button>
      </div>
    </div>
  );
}
