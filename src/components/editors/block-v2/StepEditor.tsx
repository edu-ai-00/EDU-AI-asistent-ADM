"use client";

import { Lightbulb, HelpCircle, Repeat } from "lucide-react";
import type { BlockStep, BlockType, BlockV2 } from "@/types/block-v2";
import { DEFAULT_QUESTION_CONFIG } from "@/lib/defaults";
import { MarkdownTextarea } from "@/components/MarkdownTextarea";
import { TextStepEditor } from "./steps/TextStepEditor";
import { ImageStepEditor } from "./steps/ImageStepEditor";
import { VideoStepEditor } from "./steps/VideoStepEditor";
import { AudioStepEditor } from "./steps/AudioStepEditor";
import { QuestionStepEditor } from "./steps/QuestionStepEditor";

interface StepEditorProps {
  step: BlockStep;
  blockType: BlockType;
  allSteps: BlockStep[];
  courseBlocks?: BlockV2[];
  currentBlockId?: string;
  onChange: (updates: Partial<BlockStep>) => void;
}

export function StepEditor({
  step,
  blockType,
  allSteps,
  courseBlocks,
  currentBlockId,
  onChange,
}: StepEditorProps) {
  let typeEditor: React.ReactNode;
  switch (step.type) {
    case "text":
      typeEditor = (
        <TextStepEditor
          content={step.content || ""}
          onChange={(content) => onChange({ content })}
        />
      );
      break;
    case "image":
      typeEditor = (
        <ImageStepEditor
          image={step.image}
          onChange={(image) => onChange({ image })}
          alwaysExpanded
        />
      );
      break;
    case "video":
      typeEditor = (
        <VideoStepEditor
          video={step.video}
          onChange={(video) => onChange({ video })}
          alwaysExpanded
        />
      );
      break;
    case "audio":
      typeEditor = (
        <AudioStepEditor
          audio={step.audio}
          onChange={(audio) => onChange({ audio })}
        />
      );
      break;
    case "question":
      typeEditor = (
        <QuestionStepEditor
          question={step.question || { ...DEFAULT_QUESTION_CONFIG, options: [] }}
          blockType={blockType}
          allSteps={allSteps}
          courseBlocks={courseBlocks}
          currentBlockId={currentBlockId}
          onChange={(question) => onChange({ question })}
        />
      );
      break;
    default:
      typeEditor = <p className="text-sm text-gray-400">Unknown step type</p>;
  }

  return (
    <div className="space-y-3">
      {typeEditor}
      {/* Default Practice toggle — display blocks only (exercise has block-level toggle) */}
      {blockType === "display" && (
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={step.default_practice || false}
              onChange={(e) =>
                onChange({ default_practice: e.target.checked || undefined })
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
          </label>
          <div className="flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Default Practice</span>
            <span className="text-xs text-gray-500">— auto-add this step to practice queue</span>
          </div>
        </div>
      )}
      {/* Step-level hint & help — only for non-exercise blocks (exercises use block-level hint/help) */}
      {blockType !== "exercise" && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
          <MarkdownTextarea
            value={step.hint || ""}
            onChange={(v) => onChange({ hint: v || undefined })}
            rows={3}
            placeholder="Short hint for this step..."
            label={
              <span className="flex items-center gap-1 text-xs font-medium text-gray-600">
                <Lightbulb className="w-3 h-3 text-yellow-500" />
                Step Hint
              </span>
            }
          />
          <MarkdownTextarea
            value={step.help || ""}
            onChange={(v) => onChange({ help: v || undefined })}
            rows={3}
            placeholder="Detailed help for this step..."
            label={
              <span className="flex items-center gap-1 text-xs font-medium text-gray-600">
                <HelpCircle className="w-3 h-3 text-blue-500" />
                Step Help
              </span>
            }
          />
        </div>
      )}
    </div>
  );
}
