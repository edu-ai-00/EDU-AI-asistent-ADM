"use client";

// AI Course Assistant (BR-D4PE8R) — step 2: OCR only, or author a whole course.

import { ScanText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { GenerationMode } from "@/types/generation";

interface StepModeProps {
  attachmentCount: number;
  onBack: () => void;
  onGenerate: (mode: GenerationMode) => void;
}

const MODES: {
  mode: GenerationMode;
  title: string;
  description: string;
  icon: typeof ScanText;
}[] = [
  {
    mode: "ocr",
    title: "Jen přepsat (OCR)",
    description:
      "Přepíše obsah stránek 1:1 do display bloků. Nic nevymýšlí, nedoplňuje otázky. Rychlé a levné.",
    icon: ScanText,
  },
  {
    mode: "full",
    title: "Vygenerovat celý kurz",
    description:
      "Rozdělí látku do lekcí, doplní výkladové bloky, otázky s vysvětlením a podobné procvičovací příklady. Trvá déle.",
    icon: Sparkles,
  },
];

export function StepMode({ attachmentCount, onBack, onGenerate }: StepModeProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {attachmentCount === 1
          ? "1 příloha je připravená."
          : `${attachmentCount} příloh je připraveno.`}{" "}
        Co s nimi má asistent udělat?
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {MODES.map(({ mode, title, description, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onGenerate(mode)}
            className="flex flex-col items-start gap-2 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-50/40"
          >
            <span className="flex items-center gap-2 font-medium text-gray-900">
              <Icon className="h-4 w-4 text-blue-600" />
              {title}
            </span>
            <span className="text-xs leading-relaxed text-gray-500">{description}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Vygenerovaný obsah uvidíte v dalším kroku a sami vyberete, co se vloží do kurzu.
        Do kurzu se nic neuloží, dokud v editoru nedáte Save.
      </p>

      <div className="flex justify-start pt-1">
        <Button variant="secondary" onClick={onBack}>
          Zpět
        </Button>
      </div>
    </div>
  );
}
