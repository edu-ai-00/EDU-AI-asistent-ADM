"use client";

import { AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  StructureConflictNotice,
  structureConflictFrom,
} from "@/components/admin/StructureConflictNotice";
import { GpfVectorIssuesNotice } from "@/components/admin/GpfVectorIssuesNotice";
import type { GpfVectorIssue } from "@/lib/gpf-vectors";
import type { CourseV2 } from "@/types/block-v2";

interface SaveDialogProps {
  open: boolean;
  courseV2: CourseV2 | null;
  isPending: boolean;
  /** A failed save. Kept in the dialog so a structure conflict can be listed. */
  error?: unknown;
  /** ELO vectors the app would reject (BR-S9SVNM). Listed as a warning. */
  gpfIssues?: GpfVectorIssue[];
  /** A course from "Nový kurz" (BR-FZTSDK): the save creates it at its own version. */
  isNew?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SaveDialog({
  open,
  courseV2,
  isPending,
  error,
  gpfIssues = [],
  isNew = false,
  onClose,
  onConfirm,
}: SaveDialogProps) {
  const conflict = structureConflictFrom(error);
  const message = error instanceof Error ? error.message : null;
  const hasGpfIssues = gpfIssues.length > 0;

  return (
    <Dialog open={open} onClose={onClose} title={isNew ? "Vytvořit kurz" : "Uložit změny"}>
      <div className="space-y-4">
        {courseV2 && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-gray-900">{courseV2.name}</h3>
            <p className="text-sm text-gray-500">{courseV2.course_id}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="text-green-600 font-medium">
                {isNew
                  ? `Nový kurz, verze ${courseV2.version}`
                  : `Verze ${courseV2.version} → ${courseV2.version + 1}`}
              </span>
              <span>{courseV2.lessons.length} lekcí</span>
              <span>{courseV2.blocks?.length || 0} bloků</span>
              <span className="uppercase">{courseV2.language}</span>
            </div>
          </div>
        )}

        {hasGpfIssues && <GpfVectorIssuesNotice issues={gpfIssues} />}

        {conflict ? (
          <StructureConflictNotice conflict={conflict} message={message ?? undefined} />
        ) : (
          error != null && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{message || "Nepodařilo se uložit kurz"}</span>
            </div>
          )
        )}

        {!error && (
          <p className="text-sm text-gray-600">
            {isNew
              ? "Kurz bude vytvořen a objeví se v seznamu kurzů. Chcete pokračovat?"
              : "Změny budou nahrány jako nová verze kurzu. Chcete pokračovat?"}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Zrušit
          </Button>
          <Button onClick={onConfirm} isLoading={isPending}>
            {error ? "Zkusit znovu" : isNew ? "Vytvořit kurz" : "Uložit novou verzi"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
