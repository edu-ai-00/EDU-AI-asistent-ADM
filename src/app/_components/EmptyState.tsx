"use client";

import { FileUploader } from "@/components/FileUploader";

interface EmptyStateProps {
  onFileLoad: (data: unknown, name: string) => void;
  onNewV2: () => void;
  onNewV1: () => void;
}

export function EmptyState({ onFileLoad, onNewV2, onNewV1 }: EmptyStateProps) {
  return (
    <div className="max-w-md mx-auto mt-24 space-y-6">
      <FileUploader onFileLoad={onFileLoad} />
      <button
        onClick={onNewV2}
        className="w-full py-3 px-4 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
      >
        Vytvořit nový kurz
      </button>
      <button
        onClick={onNewV1}
        className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        nebo vytvořit V1 kurz (legacy)
      </button>
    </div>
  );
}
