"use client";

import { Languages, AlertTriangle } from "lucide-react";
import type { ApiError } from "@/lib/api/client";
import type { StructureConflict } from "@/types/api";

/**
 * Pull the structure conflict out of a rejected upload (BR-AYACEK).
 *
 * The API answers a divergent language variant with a 422 carrying
 * `structure_conflict`; anything else is an ordinary error.
 */
export function structureConflictFrom(error: unknown): StructureConflict | null {
  const payload = (error as ApiError | undefined)?.payload;
  const conflict = payload?.structure_conflict as StructureConflict | undefined;

  return conflict?.against ? conflict : null;
}

/**
 * Explains which language variant the save disagrees with and exactly which
 * parts of the course structure diverged, so the author knows what to bring
 * back in line — the diff paths are `blocks.<block_id>.…` on purpose.
 */
export function StructureConflictNotice({
  conflict,
  message,
}: {
  conflict: StructureConflict;
  message?: string;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
      <div className="flex items-start gap-2 text-sm text-amber-900">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Uložení zablokováno — nesouhlasí struktura jazykových variant</p>
          {message && <p className="mt-0.5 text-amber-800">{message}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-amber-800">
        <Languages className="w-3.5 h-3.5 shrink-0" />
        <span>
          Porovnáno s variantou{" "}
          <span className="font-medium uppercase">{conflict.against.language}</span>{" "}
          — <span className="font-mono">{conflict.against.course_id}</span> (v
          {conflict.against.version})
        </span>
      </div>

      {conflict.diff.length > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-900 mb-1">
            Rozdíly ({conflict.diff.length}):
          </p>
          <ul className="max-h-48 overflow-y-auto rounded border border-amber-200 bg-white/70 divide-y divide-amber-100">
            {conflict.diff.map((line, index) => (
              <li
                key={`${line}-${index}`}
                className="px-2 py-1 font-mono text-[11px] leading-snug text-amber-900 break-all"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-amber-800">
        Mezi jazyky se smí lišit jen texty. Srovnejte strukturu ve všech
        variantách a uložte znovu.
      </p>
    </div>
  );
}
