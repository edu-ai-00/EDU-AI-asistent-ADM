"use client";

import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { CourseV2 } from "@/types/block-v2";

interface SaveDialogProps {
  open: boolean;
  courseV2: CourseV2 | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SaveDialog({
  open,
  courseV2,
  isPending,
  onClose,
  onConfirm,
}: SaveDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Uložit změny">
      <div className="space-y-4">
        {courseV2 && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-gray-900">{courseV2.name}</h3>
            <p className="text-sm text-gray-500">{courseV2.course_id}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="text-green-600 font-medium">
                Verze {courseV2.version} → {courseV2.version + 1}
              </span>
              <span>{courseV2.lessons.length} lekcí</span>
              <span>{courseV2.blocks?.length || 0} bloků</span>
            </div>
          </div>
        )}
        <p className="text-sm text-gray-600">
          Změny budou nahrány jako nová verze kurzu. Chcete pokračovat?
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Zrušit
          </Button>
          <Button onClick={onConfirm} isLoading={isPending}>
            Uložit novou verzi
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
