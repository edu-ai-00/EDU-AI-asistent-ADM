"use client";

import type { GPFData } from "@/types/block-v2";
import { GPF_LEVEL_LABELS } from "@/lib/defaults";
import { EloVectorsEditor } from "./EloVectorsEditor";
import type { VectorDimensionLabel } from "./types";

interface BlockGPFEditorProps {
  gpf: GPFData;
  onChange: (field: keyof GPFData, value: unknown) => void;
  onBothEloChange: (rel: number[] | undefined, elo: number[] | undefined) => void;
  vectorDimensions?: VectorDimensionLabel[];
}

export function BlockGPFEditor({
  gpf,
  onChange,
  onBothEloChange,
  vectorDimensions,
}: BlockGPFEditorProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Domain
        </label>
        <input
          type="text"
          value={gpf.domain}
          onChange={(e) => onChange("domain", e.target.value)}
          placeholder="Number and operation, Algebra, Measurement, Geometry, Statistics"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Construct
          </label>
          <input
            type="text"
            value={gpf.construct}
            onChange={(e) => onChange("construct", e.target.value)}
            placeholder="N2 FRACTIONS"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subconstruct
          </label>
          <input
            type="text"
            value={gpf.subconstruct}
            onChange={(e) => onChange("subconstruct", e.target.value)}
            placeholder="N2.3 Solve real-world problems..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grade (1-10)
          </label>
          <input
            type="number"
            value={gpf.grade ?? ""}
            onChange={(e) =>
              onChange(
                "grade",
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            min={1}
            max={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Level
          </label>
          <select
            value={gpf.level}
            onChange={(e) =>
              onChange("level", parseInt(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {Object.entries(GPF_LEVEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          GPF Vector (comma-separated numbers)
        </label>
        <input
          type="text"
          value={(gpf.vector || []).join(", ")}
          onChange={(e) =>
            onChange(
              "vector",
              e.target.value
                .split(",")
                .map((v) => parseFloat(v.trim()))
                .filter((v) => !isNaN(v))
            )
          }
          placeholder="0, 0, 1, 2, 0, ..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
      </div>

      <EloVectorsEditor
        relationVector={gpf.relation_vector}
        eloVector={gpf.elo_vector}
        onRelationChange={(v) => onChange("relation_vector", v)}
        onEloChange={(v) => onChange("elo_vector", v)}
        onBothChange={onBothEloChange}
        dimensions={vectorDimensions}
      />
    </>
  );
}
