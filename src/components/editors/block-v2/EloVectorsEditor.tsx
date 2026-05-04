"use client";

import { useState } from "react";
import { BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VectorDimensionLabel } from "./types";

const ELO_VECTOR_LENGTH = 35;

const REL_COLORS: Record<number, string> = {
  0: "bg-gray-100 text-gray-400",
  1: "bg-yellow-100 text-yellow-700",
  2: "bg-green-100 text-green-700",
};

interface EloVectorsEditorProps {
  relationVector?: number[];
  eloVector?: number[];
  onRelationChange: (v: number[] | undefined) => void;
  onEloChange: (v: number[] | undefined) => void;
  onBothChange: (rel: number[] | undefined, elo: number[] | undefined) => void;
  dimensions?: VectorDimensionLabel[];
}

export function EloVectorsEditor({
  relationVector,
  eloVector,
  onRelationChange,
  onEloChange,
  onBothChange,
  dimensions,
}: EloVectorsEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasData = !!relationVector || !!eloVector;

  const vectorLength = dimensions?.length || ELO_VECTOR_LENGTH;
  const rel = relationVector || new Array(vectorLength).fill(0);
  const elo = eloVector || new Array(vectorLength).fill(5.0);

  const updateRelation = (index: number, value: number) => {
    const newVec = [...rel];
    newVec[index] = value;
    onRelationChange(newVec);
  };

  const updateElo = (index: number, value: number) => {
    const newVec = [...elo];
    newVec[index] = value;
    onEloChange(newVec);
  };

  const cycleRelation = (index: number) => {
    const next = ((rel[index] ?? 0) + 1) % 3;
    updateRelation(index, next);
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
              const dim = dimensions?.[i];
              const rv = rel[i] ?? 0;
              const ev = elo[i] ?? 5.0;
              const relLabel = rv === 0 ? "nesouvisí" : rv === 1 ? "slabá" : "silná";
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
                      REL_COLORS[rv]
                    )}
                    title={`Klikni pro změnu: ${relLabel} → ${rv === 2 ? "nesouvisí" : rv === 0 ? "slabá" : "silná"}`}
                  >
                    {rv} {rv === 0 ? "—" : rv === 1 ? "slabá" : "silná"}
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
                    className="w-16 shrink-0 px-1.5 py-0.5 text-xs border border-gray-200 rounded font-mono text-center bg-white focus:border-indigo-400 focus:outline-none"
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
