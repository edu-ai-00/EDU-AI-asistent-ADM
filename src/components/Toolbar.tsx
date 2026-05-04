"use client";

import Link from "next/link";
import { Download, Save, BookOpen } from "lucide-react";

interface ToolbarProps {
  filename: string | null;
  hasChanges: boolean;
  onExport: () => void;
  onSave: () => void;
  importVersion?: "v1" | "v2" | null;
}

export function Toolbar({
  filename,
  hasChanges,
  onExport,
  onSave,
  importVersion,
}: ToolbarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-800">EDU Admin</h1>
        <Link
          href="/docs"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Docs
        </Link>
        {importVersion && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              importVersion === "v2"
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {importVersion === "v2" ? "V2 (GPF+FSRS)" : "V1"}
          </span>
        )}
        {filename && (
          <span className="text-sm text-gray-500">
            {filename}
            {hasChanges && <span className="text-orange-500 ml-1">*</span>}
          </span>
        )}
      </div>

      {filename && (
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={!hasChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
}
