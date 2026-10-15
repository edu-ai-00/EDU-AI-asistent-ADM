"use client";

import { useState } from "react";
import { BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GPF_VECTOR_LENGTH,
  dimensionsBySlot,
  gpfSlotNumber,
  isEloRating,
  isRelationValue,
} from "@/lib/gpf-vectors";
import type { VectorDimensionLabel } from "./types";

const REL_COLORS: Record<number, string> = {
  0: "bg-gray-100 text-gray-400",
  1: "bg-yellow-100 text-yellow-700",
  2: "bg-green-100 text-green-700",
};

/** A slot the app's ELO engine would reject (BR-S9SVNM). */
const INVALID_COLORS = "bg-red-100 text-red-700 ring-1 ring-red-300";

interface EloVectorsEditorProps {
  relationVector?: number[];
  eloVector?: number[];
  onBothChange: (rel: number[] | undefined, elo: number[] | undefined) => void;
  dimensions?: VectorDimensionLabel[];
}

export function EloVectorsEditor({
  relationVector,
  eloVector,
  onBothChange,
  dimensions,
}: EloVectorsEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasData = !!relationVector || !!eloVector;

  // The app's ELO engine takes exactly 35 slots whatever vector the course
  // uses for labels, so both vectors are always edited at that width: short
  // ones are padded, long ones trimmed, and an edit never leaves a hole that
  // would be saved as null (BR-S9SVNM). Slots are read as the numbers the app
  // reads them as — imported courses store "2" for 2 (BR-6DRK92) — so an edit
  // also writes the whole vector back as plain numbers.
  const vectorLength = GPF_VECTOR_LENGTH;
  const rel = Array.from({ length: vectorLength }, (_, i) => gpfSlotNumber(relationVector?.[i]) ?? 0);
  const elo = Array.from({ length: vectorLength }, (_, i) => gpfSlotNumber(eloVector?.[i]) ?? 5.0);
  const dimensionAt = dimensionsBySlot(dimensions);

  // What is actually stored in a slot, so a null or a non-numeric string shows
  // up red instead of being masked by the padding above. Slots past the end
  // of a short vector are just padding, and the save dialog reports the length.
  const storedRelation = (i: number): unknown =>
    relationVector && i < relationVector.length ? relationVector[i] : 0;
  const storedElo = (i: number): unknown =>
    eloVector && i < eloVector.length ? eloVector[i] : 5.0;

  // Always write both: a block with only one of the two vectors is skipped
  // by the app's ELO update.
  const updateRelation = (index: number, value: number) => {
    const newVec = [...rel];
    newVec[index] = value;
    onBothChange(newVec, elo);
  };

  const updateElo = (index: number, value: number) => {
    const newVec = [...elo];
    newVec[index] = value;
    onBothChange(rel, newVec);
  };

  // 0 → 1 → 2 → 0; anything invalid restarts at 0.
  const nextRelation = (stored: unknown) => {
    const current = gpfSlotNumber(stored);
    return current === 0 ? 1 : current === 1 ? 2 : 0;
  };
  const cycleRelation = (index: number) => {
    updateRelation(index, nextRelation(storedRelation(index)));
  };

  const fillDefaults = () => {
    onBothChange(
      new Array(vectorLength).fill(0),
      new Array(vectorLength).fill(5.0),
    );
  };

  const clearVectors = () => {
    onBothChange(undefined, undefined);
    setIsExpanded(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
      >
        <span className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          ELO vektory
          {hasData && (
            <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              aktivní
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Action buttons + legend */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={fillDefaults}
                className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors"
              >
                Vyplnit výchozí
              </button>
              {hasData && (
                <button
                  onClick={clearVectors}
                  className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                >
                  Vymazat vektory
                </button>
              )}
            </div>
            <div className="flex gap-2 text-[10px] text-gray-500">
              <span>0=nesouvisí</span>
              <span>1=slabá</span>
              <span>2=silná</span>
            </div>
          </div>

          {/* Dimension list */}
          <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-lg">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-medium text-gray-500 sticky top-0 z-10">
              <span className="w-10 shrink-0 text-center">#</span>
              {dimensions && <span className="w-14 shrink-0">Kód</span>}
              <span className="flex-1 min-w-0">Dimenze</span>
              <span className="w-16 shrink-0 text-center">Souvislost</span>
              <span className="w-16 shrink-0 text-center">ELO</span>
            </div>
            {/* Rows */}
            {Array.from({ length: vectorLength }, (_, i) => {
              const dim = dimensionAt.get(i);
              const rv = rel[i];
              const ev = elo[i];
              const storedRv = storedRelation(i);
              const relValid = isRelationValue(storedRv);
              // null marks an unrated slot and is fine; it shows as the 5.0 default.
              const storedEv = storedElo(i);
              const eloValid = storedEv == null || isEloRating(storedEv);
              const relLabel = !relValid
                ? "neplatná"
                : rv === 0 ? "nesouvisí" : rv === 1 ? "slabá" : "silná";
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 text-xs",
                    rv > 0 ? "bg-indigo-50/30" : "hover:bg-gray-50"
                  )}
                >
                  <span className="w-10 shrink-0 text-center text-gray-400 font-mono text-[10px]">{i}</span>
                  {dimensions && (
                    <span className="w-14 shrink-0 font-mono text-blue-600 text-[11px] truncate">
                      {dim?.code || "—"}
                    </span>
                  )}
                  <span className="flex-1 min-w-0 text-gray-700 truncate" title={dim?.name}>
                    {dim?.name || `Dimenze ${i}`}
                  </span>
                  <button
                    onClick={() => cycleRelation(i)}
                    className={cn(
                      "w-16 shrink-0 h-6 text-[11px] font-semibold rounded transition-colors text-center",
                      relValid ? REL_COLORS[rv] : INVALID_COLORS
                    )}
                    title={`Klikni pro změnu: ${relLabel} → ${["nesouvisí", "slabá", "silná"][nextRelation(storedRv)]}`}
                  >
                    {relValid
                      ? `${rv} ${rv === 0 ? "—" : rv === 1 ? "slabá" : "silná"}`
                      : `${JSON.stringify(storedRv) ?? "?"} !`}
                  </button>
                  <input
                    type="number"
                    value={ev}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) updateElo(i, Math.min(10, Math.max(1, val)));
                    }}
                    min={1}
                    max={10}
                    step={0.5}
                    className={cn(
                      "w-16 shrink-0 px-1.5 py-0.5 text-xs border rounded font-mono text-center focus:border-indigo-400 focus:outline-none",
                      eloValid ? "border-gray-200 bg-white" : "border-red-300 bg-red-50 text-red-700"
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
