"use client";

import { useState, useEffect } from "react";
import { Download, FileSpreadsheet, Users, AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api } from "@/lib/api/client";
import type { Course } from "@/types/api";

interface ExportAnswersDialogProps {
  course: Course | null;
  onClose: () => void;
}

interface AnswersMeta {
  total_users: number;
  total_answers: number;
}

export function ExportAnswersDialog({ course, onClose }: ExportAnswersDialogProps) {
  const [meta, setMeta] = useState<AnswersMeta | null>(null);
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
      .getFullResponse<{ data: unknown[]; meta: AnswersMeta }>(
        `/admin/progress/${course.course_id}/answers`
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
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

      // Get token from cookie
      const tokenMatch = document.cookie.match(/(?:^|;\s*)edu-admin-token=([^;]*)/);
      const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

      const headers: HeadersInit = { Accept: "text/tab-separated-values" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const adminKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY || "";
      if (adminKey) {
        headers["X-Admin-Key"] = adminKey;
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/progress/${course.course_id}/answers/export`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Export selhal (${response.status})`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `odpovedi-${course.course_id}-${new Date().toISOString().slice(0, 10)}.csv`;
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
    <Dialog open={!!course} onClose={onClose} title="Export odpovědí žáků">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-500">Načítání odpovědí...</span>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center">
                <Users className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-gray-900">{meta.total_users}</div>
                <div className="text-xs text-gray-500">Žáků</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center">
                <FileSpreadsheet className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-gray-900">{meta.total_answers}</div>
                <div className="text-xs text-gray-500">Odpovědí</div>
              </div>
            </div>
          )}

          {/* Column info */}
          <div className="text-xs text-gray-500 leading-relaxed">
            CSV (TSV) obsahuje konkrétní volby a texty: ID žáka, Jméno, E-mail, ID třídy,
            Lekce, Blok, Krok, Otázka, Typ otázky, Odpověď (ID možnosti),
            Odpověď (text možnosti), Otevřená odpověď, Správně, Den, Otevřeno,
            Potvrzeno, Doba. Zahrnuje i dotazníkové/postojové otázky bez „správně/špatně".
          </div>

          {meta?.total_answers === 0 && (
            <div className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Pro tento kurz zatím nejsou žádné odpovědi k exportu.
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
              disabled={!meta || meta.total_answers === 0}
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
