"use client";

import { useState } from "react";
import {
  Trash2,
  Copy,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { BlockStep, BlockType, BlockV2, StepType } from "@/types/block-v2";
import { createBlockStep, duplicateStep } from "@/lib/defaults";
import { cn, stripHtml, truncateText } from "@/lib/utils";
import { StepTypeBadge } from "./shared";
import { StepEditor } from "./StepEditor";
import { AddStepButton } from "./AddStepButton";

interface BlockStepsEditorProps {
  steps: BlockStep[];
  blockType: BlockType;
  onChange: (steps: BlockStep[]) => void;
  courseBlocks?: BlockV2[];
  currentBlockId?: string;
}

export function BlockStepsEditor({
  steps,
  blockType,
  onChange,
  courseBlocks,
  currentBlockId,
}: BlockStepsEditorProps) {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(
    steps.length > 0 ? steps[0].id : null
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Regenerate sequential step IDs (s1, s2, ...) and update go_to references
  const renumberSteps = (stepsToRenumber: BlockStep[]): BlockStep[] => {
    const idMap = new Map<string, string>();
    stepsToRenumber.forEach((s, i) => {
      const newId = `s${i + 1}`;
      if (s.id !== newId) idMap.set(s.id, newId);
    });
    return stepsToRenumber.map((s, i) => {
      const newId = `s${i + 1}`;
      const updated = { ...s, id: newId, order: i + 1 };
      // Update go_to references in question options
      if (updated.question?.options && idMap.size > 0) {
        updated.question = {
          ...updated.question,
          options: updated.question.options.map(opt =>
            opt.go_to && idMap.has(opt.go_to)
              ? { ...opt, go_to: idMap.get(opt.go_to)! }
              : opt
          ),
        };
      }
      return updated;
    });
  };

  const updateStep = (stepId: string, updates: Partial<BlockStep>) => {
    onChange(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const removeStep = (stepId: string) => {
    const filtered = steps.filter(s => s.id !== stepId);
    const newSteps = renumberSteps(filtered);
    onChange(newSteps);
    if (expandedStepId === stepId) {
      setExpandedStepId(newSteps.length > 0 ? newSteps[0].id : null);
    }
  };

  const duplicateStepFn = (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    const dup = duplicateStep(step, steps);
    const idx = steps.findIndex(s => s.id === stepId);
    const newSteps = [...steps];
    newSteps.splice(idx + 1, 0, dup);
    onChange(renumberSteps(newSteps));
    setExpandedStepId(dup.id);
  };

  const addStep = (type: StepType) => {
    const newStep = createBlockStep(type, steps);
    const newSteps = [...steps, newStep];
    onChange(newSteps);
    setExpandedStepId(newStep.id);
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const newSteps = [...steps];
    const [dragged] = newSteps.splice(dragIndex, 1);
    newSteps.splice(toIndex, 0, dragged);
    onChange(renumberSteps(newSteps));
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const getStepPreview = (step: BlockStep): string => {
    switch (step.type) {
      case "text":
        return step.content ? truncateText(stripHtml(step.content), 50) : "(empty)";
      case "image":
        return step.image?.url ? truncateText(step.image.url, 40) : "(no image)";
      case "video":
        return step.video?.url ? truncateText(step.video.url, 40) : "(no video)";
      case "audio":
        return step.audio?.url ? truncateText(step.audio.url, 40) : "(no audio)";
      case "question": {
        if (!step.question) return "(no question)";
        const tl = step.question.type === "multiple_choice" ? "MCQ" : step.question.type === "true_false" ? "T/F" : step.question.type === "numeric" ? "Numeric" : "Open";
        return step.question.type === "numeric"
          ? `Numeric — correct: ${step.question.correct_number ?? "?"} ±${step.question.tolerance ?? 0}`
          : `${tl} — ${step.question.options?.length ?? 0} options`;
      }
      default:
        return "";
    }
  };

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div
          key={step.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={cn(
            "border rounded-lg overflow-hidden transition-all",
            expandedStepId === step.id ? "border-blue-300 bg-blue-50/30" : "border-gray-200",
            dragIndex === index && "opacity-50",
            dropIndex === index && dragIndex !== null && "border-t-2 border-t-blue-500"
          )}
        >
          {/* Step header */}
          <div
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
            onClick={() => setExpandedStepId(expandedStepId === step.id ? null : step.id)}
          >
            <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0" />
            <span className="text-xs font-mono text-gray-400 w-6 flex-shrink-0">{step.id}</span>
            <StepTypeBadge type={step.type} />
            <span className="text-xs text-gray-500 truncate flex-1">{getStepPreview(step)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                duplicateStepFn(step.id);
              }}
              className="text-gray-400 hover:text-blue-600 p-0.5 flex-shrink-0"
              title="Duplikovat step"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeStep(step.id);
              }}
              className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0"
              title="Remove step"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {expandedStepId === step.id ? (
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
          </div>

          {/* Step body (expanded) */}
          {expandedStepId === step.id && (
            <div className="px-3 pb-3 pt-1 border-t border-gray-100">
              <StepEditor
                step={step}
                blockType={blockType}
                allSteps={steps}
                courseBlocks={courseBlocks}
                currentBlockId={currentBlockId}
                onChange={(updates) => updateStep(step.id, updates)}
              />
            </div>
          )}
        </div>
      ))}

      {steps.length === 0 && (
        <p className="text-sm text-gray-400 italic text-center py-4">No steps yet. Add one below.</p>
      )}

      <AddStepButton blockType={blockType} onAdd={addStep} />
    </div>
  );
}
