"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { BlockType, StepType } from "@/types/block-v2";
import { ALLOWED_STEP_TYPES, STEP_TYPE_LABELS } from "@/lib/defaults";
import { cn } from "@/lib/utils";
import { STEP_TYPE_COLORS, STEP_TYPE_ICONS } from "./shared";

interface AddStepButtonProps {
  blockType: BlockType;
  onAdd: (type: StepType) => void;
  compact?: boolean;
}

export function AddStepButton({ blockType, onAdd, compact }: AddStepButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const allowed = ALLOWED_STEP_TYPES[blockType];

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
          title="Add Step"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Step</span>
        </button>
        {isOpen && (
          <div className="absolute right-0 top-full mt-1 z-20 flex gap-1.5 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
            {allowed.map((type) => {
              const Icon = STEP_TYPE_ICONS[type];
              return (
                <button
                  key={type}
                  onClick={() => {
                    onAdd(type);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors hover:ring-2 hover:ring-blue-200",
                    STEP_TYPE_COLORS[type]
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {STEP_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Step
      </button>
      {isOpen && (
        <div className="flex gap-2 mt-2 flex-wrap justify-center">
          {allowed.map((type) => {
            const Icon = STEP_TYPE_ICONS[type];
            return (
              <button
                key={type}
                onClick={() => {
                  onAdd(type);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:ring-2 hover:ring-blue-200",
                  STEP_TYPE_COLORS[type]
                )}
              >
                <Icon className="w-4 h-4" />
                {STEP_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
