"use client";

import type { FSRSParameters } from "@/types/block-v2";

interface BlockFSRSEditorProps {
  fsrs: FSRSParameters;
  onChange: (field: keyof FSRSParameters, value: unknown) => void;
}

export function BlockFSRSEditor({ fsrs, onChange }: BlockFSRSEditorProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Initial Difficulty (D₀)
          </label>
          <input
            type="number"
            value={fsrs.initial_difficulty}
            onChange={(e) =>
              onChange("initial_difficulty", parseFloat(e.target.value))
            }
            step={0.1}
            min={0}
            max={1}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Initial Stability (S₀)
          </label>
          <input
            type="number"
            value={fsrs.initial_stability}
            onChange={(e) =>
              onChange("initial_stability", parseFloat(e.target.value))
            }
            step={0.1}
            min={0}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Initial Recall (R₀)
          </label>
          <input
            type="number"
            value={fsrs.initial_recall}
            onChange={(e) =>
              onChange("initial_recall", parseFloat(e.target.value))
            }
            step={0.05}
            min={0}
            max={1}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Forgetting Rate (λ)
          </label>
          <input
            type="number"
            value={fsrs.forgetting_rate}
            onChange={(e) =>
              onChange("forgetting_rate", parseFloat(e.target.value))
            }
            step={0.05}
            min={0}
            max={1}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Weight
          </label>
          <input
            type="number"
            value={fsrs.weight}
            onChange={(e) =>
              onChange("weight", parseFloat(e.target.value))
            }
            step={0.1}
            min={0}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Repetitions
          </label>
          <input
            type="number"
            value={fsrs.repetitions}
            onChange={(e) =>
              onChange("repetitions", parseInt(e.target.value) || 0)
            }
            min={0}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Min Interval (days)
          </label>
          <input
            type="number"
            value={fsrs.min_interval}
            onChange={(e) =>
              onChange("min_interval", parseInt(e.target.value) || 1)
            }
            min={1}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Max Interval (days)
          </label>
          <input
            type="number"
            value={fsrs.max_interval}
            onChange={(e) =>
              onChange("max_interval", parseInt(e.target.value) || 90)
            }
            min={1}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Time Limit (sec)
          </label>
          <input
            type="number"
            value={fsrs.time_limit_sec ?? ""}
            onChange={(e) =>
              onChange(
                "time_limit_sec",
                e.target.value ? parseInt(e.target.value) : undefined
              )
            }
            min={0}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Skip Condition
        </label>
        <input
          type="text"
          value={fsrs.skip_condition ?? ""}
          onChange={(e) =>
            onChange("skip_condition", e.target.value || undefined)
          }
          placeholder="GPF_mastery > 0.8"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
      </div>
    </>
  );
}
