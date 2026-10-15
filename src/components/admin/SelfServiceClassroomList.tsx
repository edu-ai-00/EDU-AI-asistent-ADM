"use client";

import { useState } from "react";
import { ShieldOff, Baby } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import {
  useSelfServiceClassrooms,
  useOffboardSelfServiceClassroom,
} from "@/hooks/useClassrooms";
import type { SelfServiceClassroom } from "@/types/classroom";

export function SelfServiceClassroomList() {
  const { data: classrooms, isLoading, error } = useSelfServiceClassrooms();
  const offboardMutation = useOffboardSelfServiceClassroom();
  const [pendingOffboard, setPendingOffboard] = useState<SelfServiceClassroom | null>(null);

  // This does not delete anything on the spot — it revokes the guardian's
  // consent through the same path their own magic-link page uses. The
  // children are locked out immediately, but the account rows (and this
  // classroom) are only erased later by the scheduled consent:purge-revoked
  // job, once the grace period has passed. The row is expected to keep
  // showing up in this list until then — that is not a bug, it means the
  // data has not actually been erased yet, and clicking this again is safe
  // (it just clears the row once there is nothing left to revoke).
  const handleOffboard = async () => {
    if (!pendingOffboard) return;
    try {
      await offboardMutation.mutateAsync(pendingOffboard.id);
      setPendingOffboard(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <LoadingPage message="Načítám samoobslužné třídy..." />;

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        Chyba při načítání: {error instanceof Error ? error.message : "Neznámá chyba"}
      </div>
    );
  }

  const rows = classrooms ?? [];

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <Baby className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-600">Zatím žádné samoobslužné třídy.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Třída
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                E-mail rodiče
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Dětí
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Založeno
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Akce
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((classroom) => (
              <tr key={classroom.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <Baby className="w-4 h-4 text-gray-400" />
                    {classroom.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {classroom.guardian_email ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{classroom.students_count}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(classroom.created_at).toLocaleDateString("cs-CZ")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setPendingOffboard(classroom)}
                    className="inline-flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 h-8 w-8 transition-colors"
                    title="Odvolat souhlas"
                  >
                    <ShieldOff className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={pendingOffboard !== null}
        onClose={() => setPendingOffboard(null)}
        title="Odvolat souhlas rodiče"
      >
        <p className="text-sm text-gray-600 mb-4">
          Opravdu chcete odvolat souhlas pro třídu <strong>{pendingOffboard?.name}</strong>?
        </p>
        <ul className="text-sm text-gray-600 mb-4 list-disc pl-5 space-y-1">
          <li>
            {pendingOffboard?.students_count} dětský účet se od teď nebude moct přihlásit —
            okamžitě.
          </li>
          <li>Rodič dostane e-mail, že byl souhlas odvolán.</li>
          <li>
            Data (přihlašovací kódy, pokrok) se natrvalo smažou až za 30 dní, pokud rodič
            souhlas znovu nepotvrdí — do té doby je akci možné vzít zpět tím, že rodič souhlas
            obnoví přes e-mail.
          </li>
        </ul>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingOffboard(null)}>
            Zrušit
          </Button>
          <Button
            variant="danger"
            onClick={handleOffboard}
            isLoading={offboardMutation.isPending}
          >
            Odvolat souhlas
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
