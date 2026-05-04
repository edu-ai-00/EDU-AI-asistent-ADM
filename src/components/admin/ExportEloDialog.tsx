"use client";

import { useState, useEffect } from "react";
import { Download, FileSpreadsheet, Users, BarChart3, AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api } from "@/lib/api/client";
import type { Course, EloInteraction } from "@/types/api";

interface ExportEloDialogProps {
  course: Course | null;
  onClose: () => void;
}

interface EloMeta {
  total: number;
  unique_users: number;
  avg_score: number | null;
}

export function ExportEloDialog({ course, onClose }: ExportEloDialogProps) {
  const [meta, setMeta] = useState<EloMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!course) {
      setMeta(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    api
      .getFullResponse<{ data: EloInteraction[]; meta: EloMeta }>(
        `/admin/elo/interactions/course/${course.course_id}`
      )
      .then((res) => {
        setMeta(res.meta);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Nepodařilo se načíst data");
      })
      .finally(() => setIsLoading(false));
  }, [course]);

  const handleExport = async () => {
    if (!course) return;

    setIsExporting(true);
    try {
      const response = await api.getRaw(
        `admin/elo/interactions/course/${course.course_id}/export`,
        "text/tab-separated-values",
      );

      if (!response.ok) {
        throw new Error(`Export selhal (${response.status})`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `elo-export-${course.course_id}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export selhal");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={!!course} onClose={onClose} title="Export ELO dat">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-500">Načítání statistik...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600 text-sm py-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Course info */}
          <div className="bg-gray-50 rounded-lg px-4 py-3">
            <div className="font-medium text-gray-900">
              {course?.emoji && <span className="mr-1">{course.emoji}</span>}
              {course?.name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 font-mono">{course?.course_id}</div>
          </div>

          {/* Stats */}
          {meta && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center">
                <FileSpreadsheet className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-gray-900">{meta.total}</div>
                <div className="text-xs text-gray-500">Záznamů</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center">
                <Users className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-gray-900">{meta.unique_users}</div>
                <div className="text-xs text-gray-500">Uživatelů</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center">
                <BarChart3 className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-gray-900">
                  {meta.avg_score !== null ? `${Math.round(meta.avg_score * 100)}%` : "—"}
                </div>
                <div className="text-xs text-gray-500">Prům. skóre</div>
              </div>
            </div>
          )}

          {/* Column info */}
          <div className="text-xs text-gray-500 leading-relaxed">
            CSV (TSV) obsahuje sloupce: ID žáka, ID třídy, Blok, Kurz, Zdroj, Skóre,
            Dimenze, ELO snapshot, ELO úlohy, Den, Otevřeno, Potvrzeno, Doba.
          </div>

          {meta?.total === 0 && (
            <div className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Pro tento kurz nejsou žádná ELO data k exportu.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Zavřít
            </Button>
            <Button
              onClick={handleExport}
              isLoading={isExporting}
              disabled={!meta || meta.total === 0}
            >
              <Download className="w-4 h-4" />
              Stáhnout CSV
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
