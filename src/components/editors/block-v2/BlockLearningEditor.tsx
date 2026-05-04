"use client";

import type { LearningMetadata } from "@/types/block-v2";
import { BLOOM_LABELS } from "@/lib/defaults";
import { PrerequisitesEditor } from "./PrerequisitesEditor";

interface BlockLearningEditorProps {
  learning: LearningMetadata;
  onChange: (field: keyof LearningMetadata, value: unknown) => void;
}

export function BlockLearningEditor({ learning, onChange }: BlockLearningEditorProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Concepts (comma-separated)
        </label>
        <input
          type="text"
          value={learning.concepts.join(", ")}
          onChange={(e) =>
            onChange(
              "concepts",
              e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
            )
          }
          placeholder="Zlomky, Smisena cisla, Spolecny jmenovatel"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bloom Level
          </label>
          <select
            value={learning.bloom_level}
            onChange={(e) =>
              onChange("bloom_level", parseInt(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {Object.entries(BLOOM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty (1-5)
          </label>
          <select
            value={learning.difficulty}
            onChange={(e) =>
              onChange("difficulty", parseInt(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d} - {["Very Easy", "Easy", "Medium", "Hard", "Very Hard"][d - 1]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Competencies (JSON: skill → percentage)
        </label>
        <textarea
          value={JSON.stringify(learning.competencies, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange("competencies", parsed);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={3}
          placeholder='{ "M.4.5.7": 50, "M.6.7.4": 30 }'
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
      </div>

      <PrerequisitesEditor
        prerequisites={learning.prerequisites}
        onChange={(prereqs) => onChange("prerequisites", prereqs)}
      />
    </>
  );
}
