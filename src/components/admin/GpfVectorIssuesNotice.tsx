"use client";

import { AlertTriangle } from "lucide-react";
import type { GpfVectorIssue } from "@/lib/gpf-vectors";

/**
 * Lists the blocks whose ELO vectors the app's engine would reject
 * (BR-S9SVNM). A warning, not a gate: such a block still reaches students and
 * silently stops moving their ELO, but holding the save hostage to it blocked
 * unrelated content edits, so the author is told and decides.
 */
export function GpfVectorIssuesNotice({
  issues,
  hint = "Uložení tím není blokováno. Opravit je lze v záložce GPF → ELO vektory: souvislost smí být jen 0, 1 nebo 2, ELO 0–10 a každý vektor má 35 prvků (úprava libovolné hodnoty doplní chybějící prvky a srovná délku).",
}: {
  issues: GpfVectorIssue[];
  /** How to fix them from wherever the notice is shown. */
  hint?: string;
}) {
  const blockCount = new Set(issues.map((issue) => issue.blockId)).size;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
      <div className="flex items-start gap-2 text-sm text-amber-900">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">
            Neplatné ELO vektory ({blockCount}{" "}
            {blockCount === 1 ? "blok" : blockCount < 5 ? "bloky" : "bloků"})
          </p>
          <p className="mt-0.5 text-amber-800">
            Aplikace u těchto bloků ELO potichu přeskočí — dovednosti žáka ani
            obtížnost úlohy se z nich nepočítají.
          </p>
        </div>
      </div>

      <ul className="max-h-48 overflow-y-auto rounded border border-amber-200 bg-white/70 divide-y divide-amber-100">
        {issues.map((issue, index) => (
          <li
            key={`${issue.blockId}-${issue.field}-${index}`}
            className="px-2 py-1 text-[11px] leading-snug text-amber-900 break-all"
          >
            <span className="font-mono font-medium">{issue.blockId}</span>
            {issue.lessonName && (
              <span className="text-amber-700"> ({issue.lessonName})</span>
            )}
            <span className="font-mono"> — {issue.message}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-amber-800">{hint}</p>
    </div>
  );
}
