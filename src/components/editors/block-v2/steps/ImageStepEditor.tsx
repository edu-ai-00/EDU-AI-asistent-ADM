"use client";

import { useState } from "react";
import { Image, Plus, Trash2 } from "lucide-react";
import type { StepImage } from "@/types/block-v2";
import { IMAGE_POSITION_LABELS } from "@/lib/defaults";
import { cn } from "@/lib/utils";

export interface ImageStepEditorProps {
  image?: StepImage;
  onChange: (image: StepImage | undefined) => void;
  alwaysExpanded?: boolean;
}

export function ImageStepEditor({ image, onChange, alwaysExpanded }: ImageStepEditorProps) {
  const [isExpanded, setIsExpanded] = useState(alwaysExpanded || !!image?.url);

  const updateImage = (updates: Partial<StepImage>) => {
    const newImage = { ...image, ...updates } as StepImage;
    if (!newImage.url) {
      onChange(undefined);
    } else {
      onChange(newImage);
    }
  };

  const showContent = alwaysExpanded || isExpanded;

  return (
    <div className={alwaysExpanded ? "" : "pt-2 border-t border-gray-100"}>
      {!alwaysExpanded && (
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
            <Image className="w-3.5 h-3.5 text-purple-500" />
            Block Image
          </label>
          {!isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Image
            </button>
          )}
        </div>
      )}

      {showContent && (
        <div className={cn("space-y-2", !alwaysExpanded && "p-3 bg-gray-50 rounded")}>
          <div className="flex gap-2">
            <input
              type="text"
              value={image?.url || ""}
              onChange={(e) => updateImage({ url: e.target.value })}
              placeholder="https://example.com/image.png"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <select
              value={image?.position || "above"}
              onChange={(e) => updateImage({ position: e.target.value as "above" | "below" | "inline" })}
              className="px-2 py-1 text-sm border border-gray-300 rounded"
            >
              {Object.entries(IMAGE_POSITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {!alwaysExpanded && (
              <button
                onClick={() => {
                  onChange(undefined);
                  setIsExpanded(false);
                }}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <input
            type="text"
            value={image?.alt || ""}
            onChange={(e) => updateImage({ alt: e.target.value })}
            placeholder="Alt text for accessibility"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />

          {image?.url && (
            <div className="mt-2">
              <img
                src={image.url}
                alt={image.alt || "Preview"}
                className="max-h-32 rounded border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
