"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MarkdownPreview } from "@/components/MarkdownPreview";

interface MarkdownTextareaProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function MarkdownTextarea({
  value,
  onChange,
  rows = 4,
  placeholder,
  label,
  className,
}: MarkdownTextareaProps) {
  const [preview, setPreview] = useState(false);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-sm font-medium text-gray-700">{label}</label>
        )}
        <div className="flex items-center rounded-md border border-gray-200 text-xs overflow-hidden ml-auto">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={cn(
              "px-2 py-0.5 transition-colors",
              !preview ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
            )}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={cn(
              "px-2 py-0.5 transition-colors",
              preview ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
            )}
          >
            Preview
          </button>
        </div>
      </div>
      {preview ? (
        <MarkdownPreview
          content={value || ""}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white min-h-[80px] prose prose-sm max-w-none"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
        />
      )}
    </div>
  );
}
