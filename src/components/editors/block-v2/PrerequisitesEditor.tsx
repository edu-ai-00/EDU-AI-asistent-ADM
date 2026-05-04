"use client";

import { Plus, Trash2 } from "lucide-react";
import type { PrerequisiteRule } from "@/types/block-v2";

interface PrerequisitesEditorProps {
  prerequisites: PrerequisiteRule[];
  onChange: (prerequisites: PrerequisiteRule[]) => void;
}

export function PrerequisitesEditor({
  prerequisites,
  onChange,
}: PrerequisitesEditorProps) {
  const addPrerequisite = () => {
    onChange([...prerequisites, { min_level: 0.5 }]);
  };

  const removePrerequisite = (index: number) => {
    onChange(prerequisites.filter((_, i) => i !== index));
  };

  const updatePrerequisite = (
    index: number,
    updates: Partial<PrerequisiteRule>
  ) => {
    onChange(
      prerequisites.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Prerequisites
        </label>
        <button
          onClick={addPrerequisite}
          className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
      <div className="space-y-2">
        {prerequisites.map((prereq, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 bg-gray-50 rounded"
          >
            <input
              type="text"
              value={prereq.block_id || ""}
              onChange={(e) =>
                updatePrerequisite(index, { block_id: e.target.value || undefined })
              }
              placeholder="Block ID"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <input
              type="text"
              value={prereq.skill || ""}
              onChange={(e) =>
                updatePrerequisite(index, { skill: e.target.value || undefined })
              }
              placeholder="Skill"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <input
              type="number"
              value={prereq.min_level}
              onChange={(e) =>
                updatePrerequisite(index, {
                  min_level: parseFloat(e.target.value) || 0,
                })
              }
              step={0.1}
              min={0}
              max={1}
              placeholder="Min Level"
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
            />
            <button
              onClick={() => removePrerequisite(index)}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {prerequisites.length === 0 && (
          <p className="text-sm text-gray-400 italic">No prerequisites</p>
        )}
      </div>
    </div>
  );
}
