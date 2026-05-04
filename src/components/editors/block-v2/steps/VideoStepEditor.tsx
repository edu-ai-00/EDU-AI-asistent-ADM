"use client";

import { useState } from "react";
import { Video, Plus, Trash2 } from "lucide-react";
import type { StepVideo } from "@/types/block-v2";
import { IMAGE_POSITION_LABELS } from "@/lib/defaults";
import { cn } from "@/lib/utils";

export interface VideoStepEditorProps {
  video?: StepVideo;
  onChange: (video: StepVideo | undefined) => void;
  alwaysExpanded?: boolean;
}

export function VideoStepEditor({ video, onChange, alwaysExpanded }: VideoStepEditorProps) {
  const [isExpanded, setIsExpanded] = useState(alwaysExpanded || !!video?.url);

  const updateVideo = (updates: Partial<StepVideo>) => {
    const newVideo = { ...video, ...updates } as StepVideo;
    if (!newVideo.url) {
      onChange(undefined);
    } else {
      onChange(newVideo);
    }
  };

  const showContent = alwaysExpanded || isExpanded;

  return (
    <div className={alwaysExpanded ? "" : "pt-2 border-t border-gray-100"}>
      {!alwaysExpanded && (
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
            <Video className="w-3.5 h-3.5 text-red-500" />
            Block Video
          </label>
          {!isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Video
            </button>
          )}
        </div>
      )}

      {showContent && (
        <div className={cn("space-y-2", !alwaysExpanded && "p-3 bg-gray-50 rounded")}>
          <div className="flex gap-2">
            <input
              type="text"
              value={video?.url || ""}
              onChange={(e) => updateVideo({ url: e.target.value })}
              placeholder="https://example.com/video.mp4"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <select
              value={video?.position || "above"}
              onChange={(e) => updateVideo({ position: e.target.value as "above" | "below" | "inline" })}
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

          {video?.url && (
            <video
              src={video.url}
              controls
              className="w-full max-h-48 rounded border border-gray-200"
            />
          )}
        </div>
      )}
    </div>
  );
}
