"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import {
  ELSEWHERE_GROUP,
  classGroups,
  pickableSchools,
  toggleId,
  type PickableClass,
  type PickableSchool,
} from "@/lib/user-school-classes";

// Copy of pluralCs from lib/notifications, which this release does not ship.
// The next staging → main release brings that module back; import it from
// there again then.
function pluralCs(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  if (abs >= 2 && abs <= 4) return few;
  return many;
}

const labelClass = "block text-sm font-medium text-gray-700";
const listClass =
  "h-72 overflow-y-auto border border-gray-300 rounded-lg bg-white divide-y divide-gray-100";

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-2">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

/**
 * Schools first, then the classes of those schools (BR-QKCBCT) — the two
 * steps of "Upravit uživatele", side by side, each searchable. What the
 * picks mean (persisted schools or just a filter, taught or attended
 * classes) is the dialog's business; this only lays them out. See
 * lib/user-school-classes.ts for which classes step two offers.
 */
export function SchoolClassPicker({
  schools,
  schoolsLoading,
  schoolIds,
  onSchoolIdsChange,
  schoolHint,
  classes,
  classIds,
  onClassIdsChange,
  classHint,
}: {
  schools: PickableSchool[];
  schoolsLoading: boolean;
  schoolIds: number[];
  onSchoolIdsChange: (ids: number[]) => void;
  schoolHint: string;
  classes: PickableClass[];
  classIds: number[];
  onClassIdsChange: (ids: number[]) => void;
  classHint: string;
}) {
  const [schoolQuery, setSchoolQuery] = useState("");
  const [classQuery, setClassQuery] = useState("");

  const shownSchools = pickableSchools(schools, schoolQuery);
  const pickedSchools = pickableSchools(schools, "").filter((s) => schoolIds.includes(s.id));
  const groups = classGroups({
    classes,
    schools,
    schoolIds,
    assignedIds: classIds,
    query: classQuery,
  });
  // Ids the editor cannot see (another teacher's class) are kept on save but
  // never listed, so they do not count here either.
  const pickedClasses = classes.filter((c) => classIds.includes(c.id)).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelClass}>1. Školy</label>
        <p className="text-xs text-gray-400 mb-2 min-h-8">{schoolHint}</p>
        {/* The picks at a glance — in a list of twenty they are usually scrolled away. */}
        <div className="flex flex-wrap gap-1 mb-2 min-h-6">
          {pickedSchools.length === 0 ? (
            <span className="text-xs text-gray-400 leading-6">Žádná škola nevybrána</span>
          ) : (
            pickedSchools.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 max-w-full rounded-full bg-blue-50 text-blue-700 text-xs pl-2 pr-1 py-0.5"
              >
                <span className="truncate">{s.name}</span>
                <button
                  type="button"
                  onClick={() => onSchoolIdsChange(toggleId(schoolIds, s.id))}
                  className="rounded-full p-0.5 hover:bg-blue-100"
                  aria-label={`Odebrat ${s.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <SearchBox value={schoolQuery} onChange={setSchoolQuery} placeholder="Hledat školu…" />
        <div className={listClass}>
          {schoolsLoading ? (
            <p className="px-3 py-2 text-sm text-gray-400">Načítám školy…</p>
          ) : schools.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">
              Zatím žádné školy — založte je na záložce Školy.
            </p>
          ) : shownSchools.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">Žádná škola neodpovídá hledání.</p>
          ) : (
            shownSchools.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={schoolIds.includes(s.id)}
                  onChange={() => onSchoolIdsChange(toggleId(schoolIds, s.id))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900 truncate">{s.name}</span>
                {s.identifier && (
                  <span className="text-xs text-gray-400 shrink-0">{s.identifier}</span>
                )}
              </label>
            ))
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>2. Třídy</label>
        <p className="text-xs text-gray-400 mb-2 min-h-8">{classHint}</p>
        <p className="text-xs text-gray-400 leading-6 mb-2 min-h-6">
          {pickedClasses === 0
            ? "Žádná třída nevybrána"
            : `Vybráno ${pickedClasses} ${pluralCs(pickedClasses, "třída", "třídy", "tříd")}`}
        </p>
        <SearchBox value={classQuery} onChange={setClassQuery} placeholder="Hledat třídu…" />
        <div className={listClass}>
          {groups.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">
              {classQuery.trim()
                ? "Žádná třída neodpovídá hledání."
                : "Nejdřív vlevo vyberte školu."}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.key}>
                <p className="sticky top-0 z-10 px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                  {g.title}
                </p>
                {g.classes.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-400">Škola nemá žádné třídy.</p>
                ) : (
                  g.classes.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={classIds.includes(c.id)}
                        onChange={() => onClassIdsChange(toggleId(classIds, c.id))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 truncate">{c.name}</span>
                      {g.key === ELSEWHERE_GROUP && c.school && (
                        <span className="text-xs text-gray-400 truncate">{c.school.name}</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
