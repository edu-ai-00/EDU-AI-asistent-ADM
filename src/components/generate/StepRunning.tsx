"use client";

// AI Course Assistant (BR-D4PE8R) — step 3: live progress.
//
// Generation runs inline on an SSE connection (production has no queue worker),
// so the only honest progress signal is "characters received so far".

import { Loader2, ScanText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { GenerationMode } from "@/types/generation";

interface StepRunningProps {
  mode: GenerationMode | null;
  progress: { stage: "ocr" | "generate"; chars: number } | null;
  onCancel: () => void;
}

export function StepRunning({ mode, progress, onCancel }: StepRunningProps) {
  const stage = progress?.stage ?? "ocr";

  const stages = [
    {
      key: "ocr" as const,
      label: "Čtu nahrané materiály",
      icon: ScanText,
    },
    ...(mode === "full"
      ? [{ key: "generate" as const, label: "Skládám lekce a příklady", icon: Sparkles }]
      : []),
  ];

  return (
    <div className="space-y-5 py-2">
      <ul className="space-y-3">
        {stages.map(({ key, label, icon: Icon }) => {
          const isActive = stage === key;
          const isDone = stage === "generate" && key === "ocr";

          return (
            <li key={key} className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isDone
                    ? "bg-green-100 text-green-600"
                    : isActive
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isActive && !isDone ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              <div>
                <p
                  className={`text-sm ${
                    isActive || isDone ? "font-medium text-gray-900" : "text-gray-400"
                  }`}
                >
                  {label}
                </p>
                {isActive && progress && (
                  <p className="text-xs text-gray-400">
                    {progress.chars.toLocaleString("cs-CZ")} znaků
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-gray-400">
        U delších PDF to může trvat i pár minut. Dialog nezavírejte.
      </p>

      <div className="flex justify-start">
        <Button variant="secondary" onClick={onCancel}>
          Zrušit
        </Button>
      </div>
    </div>
  );
}
