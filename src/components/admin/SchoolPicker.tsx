"use client";

import { useMemo, useState } from "react";

import { useSchools } from "@/hooks/useSchools";
import { assignedFirst, unassignedGroupStart } from "@/lib/school-picker-order";

/**
 * Which schools a teacher belongs to, picked from the teacher's side
 * (BR-R84FVD) — the new-member form, the team edit dialog and the user edit
 * dialog. Writes the same school_teacher pivot as the school dialog on the
 * Školy tab. Admin-only, like everything that touches schools: useSchools()
 * stays idle for a teacher and the API ignores school_ids from one.
 */
export function SchoolPicker({
  value,
  onChange,
  labelClassName = "block text-xs font-medium text-gray-500 mb-1",
}: {
  value: number[];
  onChange: (ids: number[]) => void;
  /** Match the host form's other labels; defaults to the team dialog's. */
  labelClassName?: string;
}) {
  const { data: schools, isLoading } = useSchools();

  // The schools already filed on the account go on top (BR-Z5N45R), taken
  // from the moment the dialog opened — see school-picker-order.ts for why
  // ticking a box must not reorder the list underneath.
  const [assignedOnOpen] = useState(() => new Set(value));
  const ordered = useMemo(
    () => assignedFirst(schools ?? [], assignedOnOpen),
    [schools, assignedOnOpen]
  );
  const unassignedFrom = unassignedGroupStart(ordered, assignedOnOpen);

  const toggle = (id: number) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <div>
      <label className={labelClassName}>Školy</label>
      <p className="text-xs text-gray-400 mb-2">
        Učitel uvidí v seznamu i ostatní třídy těchto škol, ale nebude si moci
        zobrazit jejich detail.
      </p>
      {isLoading ? (
        <p className="text-sm text-gray-400">Načítám školy…</p>
      ) : !schools || schools.length === 0 ? (
        <p className="text-sm text-gray-400">
          Zatím žádné školy — založte je na záložce Školy.
        </p>
      ) : (
        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
          {ordered.map((s, i) => (
            <label
              key={s.id}
              className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer ${
                i === unassignedFrom ? "border-t-2 border-t-gray-200" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={value.includes(s.id)}
                onChange={() => toggle(s.id)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-900">{s.name}</span>
              {s.identifier && (
                <span className="text-xs text-gray-400">{s.identifier}</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
