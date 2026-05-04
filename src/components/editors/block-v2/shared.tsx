"use client";

import {
  FileText,
  Image,
  Video,
  Volume2,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import type { StepType } from "@/types/block-v2";
import { STEP_TYPE_LABELS } from "@/lib/defaults";
import { cn } from "@/lib/utils";

export const STEP_TYPE_COLORS: Record<StepType, string> = {
  text: "bg-gray-100 text-gray-700",
  image: "bg-purple-100 text-purple-700",
  video: "bg-red-100 text-red-700",
  audio: "bg-teal-100 text-teal-700",
  question: "bg-orange-100 text-orange-700",
};

export const STEP_TYPE_ICONS: Record<StepType, LucideIcon> = {
  text: FileText,
  image: Image,
  video: Video,
  audio: Volume2,
  question: HelpCircle,
};

export function StepTypeBadge({ type }: { type: StepType }) {
  const Icon = STEP_TYPE_ICONS[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
        STEP_TYPE_COLORS[type]
      )}
    >
      <Icon className="w-3 h-3" />
      {STEP_TYPE_LABELS[type]}
    </span>
  );
}
