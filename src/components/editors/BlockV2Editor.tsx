"use client";

import {
  Brain,
  BookOpen,
  BarChart3,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Workflow,
} from "lucide-react";
import type {
  BlockV2,
  BlockStep,
  GPFData,
  LearningMetadata,
  FSRSParameters,
} from "@/types/block-v2";
import { DEFAULT_FSRS, createBlockStep } from "@/lib/defaults";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlockIdentificationEditor } from "./block-v2/BlockIdentificationEditor";
import { BlockStepsEditor } from "./block-v2/BlockStepsEditor";
import { BlockLearningEditor } from "./block-v2/BlockLearningEditor";
import { BlockGPFEditor } from "./block-v2/BlockGPFEditor";
import { BlockFSRSEditor } from "./block-v2/BlockFSRSEditor";
import { StepFlowVisualizer } from "./block-v2/StepFlowVisualizer";
import { AddStepButton } from "./block-v2/AddStepButton";
import type { VectorDimensionLabel } from "./block-v2/types";

export type { VectorDimensionLabel } from "./block-v2/types";

interface BlockV2EditorProps {
  block: BlockV2;
  onChange: (block: BlockV2) => void;
  onDelete?: () => void;
  courseBlocks?: BlockV2[];
  /** Dimension labels from the course's assigned skill vector */
  vectorDimensions?: VectorDimensionLabel[];
}

export function BlockV2Editor({ block, onChange, onDelete, courseBlocks, vectorDimensions }: BlockV2EditorProps) {
  const handleFieldChange = (field: keyof BlockV2, value: unknown) => {
    onChange({ ...block, [field]: value });
  };

  const handleGPFChange = (field: keyof GPFData, value: unknown) => {
    onChange({ ...block, gpf: { ...block.gpf, [field]: value } });
  };

  const handleLearningChange = (field: keyof LearningMetadata, value: unknown) => {
    onChange({ ...block, learning: { ...block.learning, [field]: value } });
  };

  const handleFSRSChange = (field: keyof FSRSParameters, value: unknown) => {
    const fsrs = block.fsrs || { ...DEFAULT_FSRS };
    onChange({ ...block, fsrs: { ...fsrs, [field]: value } });
  };

  const fsrs = block.fsrs || DEFAULT_FSRS;
  const steps = block.steps || [];

  // Handle type change — adjust steps for the new type
  const handleTypeChange = (newType: BlockV2["type"]) => {
    let newSteps = [...steps];

    if (newType === "display") {
      // Remove question steps (not allowed in display)
      newSteps = newSteps.filter(s => s.type !== "question");
      if (newSteps.length === 0) {
        newSteps.push(createBlockStep("text", []));
      }
    } else if (newType === "question" || newType === "exercise") {
      // Ensure at least one question step
      const hasQuestion = newSteps.some(s => s.type === "question");
      if (!hasQuestion) {
        newSteps.push(createBlockStep("question", newSteps));
      }
    }

    // Reorder
    newSteps = newSteps.map((s, i) => ({ ...s, order: i + 1 }));

    onChange({ ...block, type: newType, steps: newSteps });
  };

  // Steps handlers
  const handleStepsChange = (newSteps: BlockStep[]) => {
    onChange({ ...block, steps: newSteps });
  };

  return (
    <div className="space-y-4">
      <BlockIdentificationEditor
        block={block}
        onFieldChange={handleFieldChange}
        onTypeChange={handleTypeChange}
        onDelete={onDelete}
      />

      {/* Tabs */}
      <Tabs defaultValue="steps" className="w-full">
        <div className="flex items-center gap-1">
          <TabsList className="flex-1 justify-start">
            <TabsTrigger value="steps" className="flex items-center gap-1.5">
              <ListChecks className="w-4 h-4" />
              Steps ({steps.length})
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Learning
            </TabsTrigger>
            <TabsTrigger value="gpf" className="flex items-center gap-1.5">
              <Brain className="w-4 h-4" />
              GPF
            </TabsTrigger>
            <TabsTrigger value="fsrs" className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              FSRS
            </TabsTrigger>
            <TabsTrigger value="visualize" className="flex items-center gap-1.5">
              <Workflow className="w-4 h-4" />
              Flow
            </TabsTrigger>
          </TabsList>
          <AddStepButton
            blockType={block.type}
            onAdd={(type) => {
              const newStep = createBlockStep(type, steps);
              handleStepsChange([...steps, newStep]);
            }}
            compact
          />
        </div>

        {/* Steps Tab */}
        <TabsContent value="steps" className="min-h-[300px] space-y-4">
          <BlockStepsEditor
            steps={steps}
            blockType={block.type}
            onChange={handleStepsChange}
            courseBlocks={courseBlocks}
            currentBlockId={block.block_id}
          />

          {/* Hint & Help — available for all block types */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                Hint (shown on ? click)
              </label>
              <textarea
                value={block.hint || ""}
                onChange={(e) => handleFieldChange("hint", e.target.value || undefined)}
                rows={2}
                placeholder="Short hint to help the student..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                Help (detailed explanation)
              </label>
              <textarea
                value={block.help || ""}
                onChange={(e) => handleFieldChange("help", e.target.value || undefined)}
                rows={2}
                placeholder="Detailed help or explanation..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </TabsContent>

        {/* Learning Tab */}
        <TabsContent value="learning" className="min-h-[300px] space-y-4">
          <BlockLearningEditor
            learning={block.learning}
            onChange={handleLearningChange}
          />
        </TabsContent>

        {/* GPF Tab */}
        <TabsContent value="gpf" className="min-h-[300px] space-y-4">
          <BlockGPFEditor
            gpf={block.gpf}
            onChange={handleGPFChange}
            onBothEloChange={(r, e) =>
              onChange({ ...block, gpf: { ...block.gpf, relation_vector: r, elo_vector: e } })
            }
            vectorDimensions={vectorDimensions}
          />
        </TabsContent>

        {/* FSRS Tab */}
        <TabsContent value="fsrs" className="min-h-[300px] space-y-4">
          <BlockFSRSEditor fsrs={fsrs} onChange={handleFSRSChange} />
        </TabsContent>

        {/* Flow Visualize Tab */}
        <TabsContent value="visualize" className="min-h-[300px]">
          <StepFlowVisualizer steps={steps} blockType={block.type} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
