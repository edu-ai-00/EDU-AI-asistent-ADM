"use client";

import { ALL_SCHOOLS, NO_SCHOOL, type SchoolRef } from "@/lib/school-filter";

/**
 * "Filter by school" select for the teacher and classroom lists (BR-R84FVD).
 * Options come from the rows themselves (see lib/school-filter), so it renders
 * nothing until at least one row is filed under a school.
 */
export function SchoolFilterSelect({
  options,
  showUnfiled,
  value,
  onChange,
}: {
  options: SchoolRef[];
  /** Offer "Bez školy" — only worth it when some row has no school. */
  showUnfiled: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filtrovat podle školy"
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
    >
      <option value={ALL_SCHOOLS}>Všechny školy</option>
      {options.map((s) => (
        <option key={s.id} value={String(s.id)}>
          {s.name}
        </option>
      ))}
      {showUnfiled && <option value={NO_SCHOOL}>Bez školy</option>}
    </select>
  );
}
