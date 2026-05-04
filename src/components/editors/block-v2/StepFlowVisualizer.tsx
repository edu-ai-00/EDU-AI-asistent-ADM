"use client";

import { CornerDownRight, RotateCcw, CircleStop } from "lucide-react";
import type { BlockStep, BlockType, StepType } from "@/types/block-v2";
import { cn } from "@/lib/utils";
import { STEP_TYPE_ICONS } from "./shared";

interface StepFlowVisualizerProps {
  steps: BlockStep[];
  blockType: BlockType;
}

export function StepFlowVisualizer({ steps, blockType }: StepFlowVisualizerProps) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400 italic">
        No steps to visualize. Add steps in the Steps tab.
      </div>
    );
  }

  const NODE_COLORS: Record<StepType, { bg: string; border: string; text: string }> = {
    text: { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-700" },
    image: { bg: "bg-purple-100", border: "border-purple-400", text: "text-purple-700" },
    video: { bg: "bg-red-100", border: "border-red-400", text: "text-red-700" },
    audio: { bg: "bg-teal-100", border: "border-teal-400", text: "text-teal-700" },
    question: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700" },
  };

  // Resolve go_to to a concrete target
  const resolveGoTo = (goTo: string | undefined, currentIndex: number): { target: string; type: "next" | "jump" | "again" | "end" } => {
    if (!goTo || goTo === "NEXT_STEP") return { target: steps[currentIndex + 1]?.id ?? "END", type: "next" };
    if (goTo === "AGAIN") return { target: steps[currentIndex]?.id ?? "END", type: "again" };
    if (goTo === "END") return { target: "END", type: "end" };
    return { target: goTo, type: "jump" };
  };

  // Collect non-linear edges from question steps (jumps, again, end)
  type BranchEdge = { from: string; target: string; type: "jump" | "again" | "end"; label: string };
  const branchEdges: BranchEdge[] = [];

  steps.forEach((step, i) => {
    if (step.type === "question" && step.question?.options && blockType === "question") {
      step.question.options.forEach((opt) => {
        const resolved = resolveGoTo(opt.go_to, i);
        // Only track non-linear edges
        if (resolved.type !== "next") {
          branchEdges.push({
            from: step.id,
            target: resolved.target,
            type: resolved.type,
            label: opt.text?.slice(0, 20) || opt.id,
          });
        }
      });
    }
  });

  // Group branch edges by source
  const branchesByStep = new Map<string, BranchEdge[]>();
  branchEdges.forEach(e => {
    const list = branchesByStep.get(e.from) || [];
    list.push(e);
    branchesByStep.set(e.from, list);
  });

  const BRANCH_COLORS = {
    jump: "text-blue-500 border-blue-300",
    again: "text-amber-500 border-amber-300",
    end: "text-red-500 border-red-300",
  };

  return (
    <div className="py-4 flex flex-col items-center">
      {/* START pill */}
      <div className="px-3 py-1 rounded-full bg-green-100 border border-green-400 text-[10px] font-bold text-green-700">
        START
      </div>
      <div className="w-px h-4 bg-gray-300" />

      {steps.map((step, i) => {
        const colors = NODE_COLORS[step.type];
        const Icon = STEP_TYPE_ICONS[step.type];
        const isLast = i === steps.length - 1;
        const branches = branchesByStep.get(step.id);

        return (
          <div key={step.id} className="flex flex-col items-center">
            {/* Node row: optional left branches | node | optional right branches */}
            <div className="flex items-center gap-0">
              {/* Branch arrows on the right */}
              {branches && branches.length > 0 ? (
                <>
                  {/* The node */}
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2",
                    colors.bg, colors.border
                  )}>
                    <span className="text-xs font-mono font-bold text-gray-600">{step.id}</span>
                    <Icon className={cn("w-3.5 h-3.5", colors.text)} />
                  </div>
                  {/* Branch lines */}
                  <div className="flex flex-col gap-0.5 ml-2">
                    {branches.map((b, bi) => (
                      <div key={bi} className={cn("flex items-center gap-1 text-[10px] font-mono", BRANCH_COLORS[b.type])}>
                        <div className={cn("w-4 border-t border-dashed", b.type === "jump" ? "border-blue-300" : b.type === "again" ? "border-amber-300" : "border-red-300")} />
                        {b.type === "again" && <RotateCcw className="w-3 h-3 flex-shrink-0" />}
                        {b.type === "end" && <CircleStop className="w-3 h-3 flex-shrink-0" />}
                        {b.type === "jump" && <CornerDownRight className="w-3 h-3 flex-shrink-0" />}
                        <span>{b.target}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Simple node, no branches */
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2",
                  colors.bg, colors.border
                )}>
                  <span className="text-xs font-mono font-bold text-gray-600">{step.id}</span>
                  <Icon className={cn("w-3.5 h-3.5", colors.text)} />
                </div>
              )}
            </div>

            {/* Connector line to next */}
            {!isLast ? (
              <div className="w-px h-4 bg-gray-300" />
            ) : (
              <>
                <div className="w-px h-4 bg-gray-300" />
                <div className="px-3 py-1 rounded-full bg-red-100 border border-red-300 text-[10px] font-bold text-red-600">
                  END
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
