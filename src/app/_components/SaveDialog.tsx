"use client";

import { AlertCircle, AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  StructureConflictNotice,
  structureConflictFrom,
} from "@/components/admin/StructureConflictNotice";
import { GpfVectorIssuesNotice } from "@/components/admin/GpfVectorIssuesNotice";
import { editConflictFrom } from "@/lib/course-edit";
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
  /** Loading the current version after an edit conflict (BR-JUWYK2). */
  isReloading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Drop the local copy and load the course as it is on the server. */
  onReload?: () => void;
}

export function SaveDialog({
  open,
  courseV2,
  isPending,
  error,
  gpfIssues = [],
  isNew = false,
  isReloading = false,
  onClose,
  onConfirm,
  onReload,
}: SaveDialogProps) {
  const conflict = structureConflictFrom(error);
  // Someone else changed the course since this copy was loaded (BR-JUWYK2).
  // Retrying cannot succeed, so the way out is loading the current version.
  const editConflict = onReload ? editConflictFrom(error) : null;
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

        {editConflict ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Kurz mezitím upravil někdo jiný</p>
                <p className="mt-0.5 text-amber-800">
                  Vaše kopie vychází z verze {editConflict.base_version}, na serveru je už
                  verze {editConflict.current_version}. Uložením byste změny druhého
                  autora přepsali, proto se neuložilo nic.
                </p>
              </div>
            </div>
            <p className="text-amber-800">
              Načtením aktuální verze se vaše neuložené úpravy zahodí. Chcete-li si je
              ponechat, zavřete toto okno, stáhněte je tlačítkem Export JSON a po načtení
              je přeneste.
            </p>
          </div>
        ) : conflict ? (
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
          <Button variant="secondary" onClick={onClose} disabled={isPending || isReloading}>
            Zrušit
          </Button>
          {editConflict && onReload ? (
            <Button onClick={onReload} isLoading={isReloading}>
              Načíst aktuální verzi
            </Button>
          ) : (
            <Button onClick={onConfirm} isLoading={isPending}>
              {error ? "Zkusit znovu" : isNew ? "Vytvořit kurz" : "Uložit novou verzi"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
