"use client";

import { useState, useMemo } from "react";
import { Search, Users, Download, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useClassroomEnrolledCourses, useClassroomSkillsOverview } from "@/hooks/useClassrooms";

function levelColor(level: number | null): string {
  if (level === null) return "bg-gray-100 text-gray-400";
  if (level <= 3) return "bg-red-100 text-red-800";
  if (level <= 5) return "bg-orange-100 text-orange-800";
  if (level <= 7) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

interface ClassroomSkillsSectionProps {
  classroomId: number;
}

export function ClassroomSkillsSection({ classroomId }: ClassroomSkillsSectionProps) {
  const { data: enrolledCourses, isLoading: coursesLoading } = useClassroomEnrolledCourses(classroomId);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [aggregated, setAggregated] = useState(true);
  const [search, setSearch] = useState("");
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const { data: overview, isLoading: overviewLoading } = useClassroomSkillsOverview(
    classroomId,
    selectedCourseId,
    aggregated
  );

  const availableCourses = enrolledCourses ?? [];

  // Auto-select first course if none selected
  if (!selectedCourseId && availableCourses.length > 0 && !coursesLoading) {
    setSelectedCourseId(availableCourses[0].id);
  }

  const filteredStudents = useMemo(() => {
    if (!overview) return [];
    if (!search) return overview.students;
    const q = search.toLowerCase();
    return overview.students.filter(
      (s) =>
        s.user.name?.toLowerCase().includes(q) ||
        s.user.email?.toLowerCase().includes(q)
    );
  }, [overview, search]);

  const handleExportCsv = () => {
    if (!overview || !filteredStudents.length) return;
    const courseName = availableCourses.find((c) => c.id === selectedCourseId)?.name ?? "";

    const header = ["Jméno", "Email", ...overview.skill_names].join(",");
    const rows = filteredStudents.map((s) =>
      [
        `"${s.user.name || ""}"`,
        `"${s.user.email || ""}"`,
        ...s.skills.map((sk) => (sk.level !== null ? sk.level.toFixed(1) : "")),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skills-classroom-${classroomId}-${courseName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (coursesLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (availableCourses.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Žáci v této třídě zatím nemají žádné kurzy</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Course selector + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedCourseId ?? ""}
          onChange={(e) => setSelectedCourseId(parseInt(e.target.value) || null)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji || "📚"} {c.name}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          <button
            onClick={() => setAggregated(true)}
            className={`px-3 py-1.5 transition-colors ${
              aggregated
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Agregované
          </button>
          <button
            onClick={() => setAggregated(false)}
            className={`px-3 py-1.5 border-l border-gray-300 transition-colors ${
              !aggregated
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Pouze kurz
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Hledat studenty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredStudents.length} studentů
          </span>
          <Button variant="secondary" size="sm" onClick={handleExportCsv} disabled={!overview}>
            <Download className="w-4 h-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Heatmap */}
      {overviewLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : !overview || overview.students.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Žádná data</p>
          <p className="text-sm mt-1">Zatím nejsou k dispozici žádná data o dovednostech</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[160px]">
                    Student
                  </th>
                  {overview.skill_names.map((name) => (
                    <th
                      key={name}
                      className="px-3 py-3 font-medium text-gray-700 text-center min-w-[70px]"
                    >
                      <span className="text-xs">{name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student, rowIdx) => (
                  <tr key={student.user.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r border-gray-100">
                      <div className="font-medium text-gray-900 text-sm">
                        {student.user.name || `User #${student.user.id}`}
                      </div>
                    </td>
                    {student.skills.map((skill, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-3 py-2 text-center relative"
                        onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <span
                          className={`inline-flex items-center justify-center w-10 h-7 rounded text-xs font-semibold ${levelColor(skill.level)}`}
                        >
                          {skill.level !== null ? skill.level.toFixed(1) : "—"}
                        </span>

                        {/* Tooltip */}
                        {hoveredCell?.row === rowIdx &&
                          hoveredCell?.col === colIdx &&
                          skill.level !== null && (
                            <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                              <p className="font-semibold">{overview.skill_names[colIdx]}</p>
                              <p>Úroveň: {skill.level.toFixed(2)}</p>
                              {skill.interval_low !== null && (
                                <p>
                                  Interval: {skill.interval_low.toFixed(1)} – {skill.interval_high?.toFixed(1)}
                                </p>
                              )}
                              {skill.confidence_label && <p>Jistota: {skill.confidence_label}</p>}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                            </div>
                          )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Legenda:</span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-red-100" /> 1–3
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-orange-100" /> 4–5
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-yellow-100" /> 6–7
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-green-100" /> 8–10
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-gray-100" /> Bez dat
            </span>
          </div>
        </>
      )}
    </div>
  );
}
