"use client";

import { useEffect, useState } from "react";
import { Trash2, Clock } from "lucide-react";
import type { BlockV2 } from "@/types/block-v2";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  BLOCK_TYPE_LABELS,
} from "@/lib/defaults";
import { cn } from "@/lib/utils";

interface BlockIdentificationEditorProps {
  block: BlockV2;
  onFieldChange: (field: keyof BlockV2, value: unknown) => void;
  onTypeChange: (newType: BlockV2["type"]) => void;
  onDelete?: () => void;
}

export function BlockIdentificationEditor({
  block,
  onFieldChange,
  onTypeChange,
  onDelete,
}: BlockIdentificationEditorProps) {
  // Local draft for block_id — committing on every keystroke would mutate
  // selection.id upstream and remount this component, losing focus.
  const [blockIdDraft, setBlockIdDraft] = useState(block.block_id);
  useEffect(() => {
    setBlockIdDraft(block.block_id);
  }, [block.block_id]);

  const commitBlockId = () => {
    const next = blockIdDraft.trim();
    if (next && next !== block.block_id) {
      onFieldChange("block_id", next);
    } else {
      setBlockIdDraft(block.block_id);
    }
  };

  return (
    <>
      {/* Header with Block ID, Language & Status */}
      <div className="flex items-start justify-between">
        <div>
          <input
            type="text"
            value={blockIdDraft}
            onChange={(e) => setBlockIdDraft(e.target.value)}
            onBlur={commitBlockId}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                setBlockIdDraft(block.block_id);
                e.currentTarget.blur();
              }
            }}
            className="text-lg font-bold text-gray-800 font-mono bg-transparent border-b border-transparent hover:border-gray-300 focus:border-green-500 focus:outline-none px-0 py-0"
          />
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated: {block.updated}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={block.language}
            onChange={(e) => onFieldChange("language", e.target.value)}
            placeholder="cs"
            className="w-16 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded border-0 text-center"
          />
          <select
            value={block.status}
            onChange={(e) =>
              onFieldChange("status", e.target.value as BlockV2["status"])
            }
            className={cn(
              "px-2 py-1 text-xs font-medium rounded border-0 cursor-pointer",
              STATUS_COLORS[block.status]
            )}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm("Opravdu smazat tento blok?")) {
                  onDelete();
                }
              }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Smazat blok"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Identification - Single row: Type, Version, Duration, Author, XP */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Type
            </label>
            <select
              value={block.type}
              onChange={(e) => onTypeChange(e.target.value as BlockV2["type"])}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
            >
              {Object.entries(BLOCK_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Version
            </label>
            <input
              type="number"
              value={block.version}
              onChange={(e) =>
                onFieldChange("version", parseInt(e.target.value) || 1)
              }
              min={1}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Duration
            </label>
            <input
              type="text"
              value={block.duration}
              onChange={(e) => onFieldChange("duration", e.target.value)}
              placeholder="5 min"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Author
            </label>
            <input
              type="text"
              value={block.author}
              onChange={(e) => onFieldChange("author", e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              XP
            </label>
            <input
              type="number"
              value={block.xp ?? 10}
              onChange={(e) =>
                onFieldChange("xp", parseInt(e.target.value) || 0)
              }
              min={0}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Default Practice toggle — exercise blocks only */}
        {block.type === "exercise" && (
          <div className="flex items-center gap-3 mt-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={block.default_practice || false}
                onChange={(e) => onFieldChange("default_practice", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
            </label>
            <div>
              <span className="text-sm font-medium text-gray-700">Default Practice</span>
              <p className="text-xs text-gray-500">Auto-add to spaced repetition / practice queue</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
