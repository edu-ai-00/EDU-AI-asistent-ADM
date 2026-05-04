"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Users,
  Search,
  ChevronDown,
} from "lucide-react";
import { useCourse } from "@/hooks/useCourses";
import { useCourseSkillsOverview, useCourseSkillStats } from "@/hooks/useSkills";
import { Button } from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import type { ComputedSkill, StudentSkillRow, CourseSkillStats } from "@/types/skills";

// ============================================================================
// Helpers
// ============================================================================

function levelColor(level: number | null): string {
  if (level === null) return "bg-gray-100 text-gray-400";
  if (level <= 3) return "bg-red-100 text-red-800";
  if (level <= 5) return "bg-orange-100 text-orange-800";
  if (level <= 7) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function levelBg(level: number | null): string {
  if (level === null) return "bg-gray-50";
  if (level <= 3) return "bg-red-50";
  if (level <= 5) return "bg-orange-50";
  if (level <= 7) return "bg-yellow-50";
  return "bg-green-50";
}

function formatMs(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

// ============================================================================
// Stats Panel
// ============================================================================

function StatsPanel({ stats }: { stats: CourseSkillStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      <StatCard label="Celkem událostí" value={(stats.total_events ?? 0).toLocaleString()} />
      <StatCard label="Studentů" value={(stats.total_students ?? 0).toString()} />
      <StatCard
        label="Správnost"
        value={stats.correct_ratio != null ? `${Math.round(stats.correct_ratio)}%` : "—"}
        color={stats.correct_ratio != null ? (stats.correct_ratio >= 70 ? "text-green-600" : stats.correct_ratio >= 50 ? "text-yellow-600" : "text-red-600") : undefined}
      />
      <StatCard
        label="Použití nápovědy"
        value={stats.help_usage_ratio != null ? `${Math.round(stats.help_usage_ratio)}%` : "—"}
      />
      <StatCard
        label="Průměrný čas"
        value={stats.avg_time_on_task_ms != null ? formatMs(stats.avg_time_on_task_ms) : "—"}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${color || "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function CourseSkillsOverviewPage({
  params,
}: {
  params: { id: string };
}) {
  const courseId = parseInt(params.id);
  const { data: course } = useCourse(courseId);
  const { data: overview, isLoading: overviewLoading } =
    useCourseSkillsOverview(courseId);
  const { data: stats } = useCourseSkillStats(courseId);

  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const filteredStudents = useMemo(() => {
    if (!overview) return [];
    let students = overview.students;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      students = students.filter(
        (s) =>
          s.user.name?.toLowerCase().includes(q) ||
          s.user.email?.toLowerCase().includes(q) ||
          s.user.classroom_name?.toLowerCase().includes(q)
      );
    }

    // Level filter
    if (filterLevel !== "all") {
      students = students.filter((s) =>
        s.skills.some((skill) => {
          const level = skill?.level ?? null;
          if (level === null) return filterLevel === "none";
          if (filterLevel === "beginner") return level <= 3;
          if (filterLevel === "intermediate")
            return level > 3 && level <= 7;
          if (filterLevel === "expert") return level > 7;
          return true;
        })
      );
    }

    return students;
  }, [overview, search, filterLevel]);

  const handleExportCsv = () => {
    if (!overview || !filteredStudents.length) return;

    const header = [
      "Jméno",
      "Email",
      "Třída",
      ...overview.skill_names,
    ].join(",");

    const rows = filteredStudents.map((s) =>
      [
        `"${s.user.name || ""}"`,
        `"${s.user.email || ""}"`,
        `"${s.user.classroom_name || ""}"`,
        ...s.skills.map((sk) =>
          sk?.level != null ? sk.level.toFixed(1) : ""
        ),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skills-overview-${course?.course_id || courseId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (overviewLoading) return <LoadingPage message="Načítám přehled..." />;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/admin/courses/${courseId}/skills`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Konfigurace dovedností
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {course?.emoji && <span className="mr-2">{course.emoji}</span>}
              Přehled dovedností – {course?.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Matice studentů a jejich dovedností
            </p>
          </div>
          <Button variant="secondary" onClick={handleExportCsv}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && <StatsPanel stats={stats} />}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
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
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Všechny úrovně</option>
          <option value="beginner">Začátečník (1–3)</option>
          <option value="intermediate">Pokročilý (4–7)</option>
          <option value="expert">Expert (8–10)</option>
          <option value="none">Bez dat</option>
        </select>
        <span className="text-sm text-gray-500">
          {filteredStudents.length} studentů
        </span>
      </div>

      {/* Heatmap */}
      {!overview || !overview.students.length ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Žádná data</p>
          <p className="text-sm mt-1">
            Zatím nejsou k dispozici žádná data o dovednostech studentů
          </p>
        </div>
      ) : (
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
                    {student.user.classroom_name && (
                      <div className="text-xs text-gray-400">
                        {student.user.classroom_name}
                      </div>
                    )}
                  </td>
                  {student.skills.map((skill, colIdx) => {
                    const level = skill?.level ?? null;
                    return (
                    <td
                      key={colIdx}
                      className="px-3 py-2 text-center relative"
                      onMouseEnter={() =>
                        setHoveredCell({ row: rowIdx, col: colIdx })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-10 h-7 rounded text-xs font-semibold ${levelColor(level)}`}
                      >
                        {level !== null
                          ? level.toFixed(1)
                          : "—"}
                      </span>

                      {/* Tooltip */}
                      {hoveredCell?.row === rowIdx &&
                        hoveredCell?.col === colIdx &&
                        level !== null && skill && (
                          <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                            <p className="font-semibold">
                              {overview.skill_names[colIdx]}
                            </p>
                            <p>
                              Úroveň: {level.toFixed(2)}
                            </p>
                            {skill.interval_low !== null && (
                              <p>
                                Interval: {skill.interval_low.toFixed(1)} –{" "}
                                {skill.interval_high?.toFixed(1)}
                              </p>
                            )}
                            {skill.confidence_label && (
                              <p>
                                Jistota: {skill.confidence_label}
                              </p>
                            )}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                          </div>
                        )}
                    </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span>Legenda:</span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-3 rounded bg-red-100" /> 1–3 (Začátečník)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-3 rounded bg-orange-100" /> 4–5
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-3 rounded bg-yellow-100" /> 6–7 (Pokročilý)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-3 rounded bg-green-100" /> 8–10 (Expert)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-3 rounded bg-gray-100" /> Bez dat
        </span>
      </div>

      {/* Problematic skills */}
      {stats?.problematic_skills && stats.problematic_skills.length > 0 && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Nejproblematičtější dovednosti
          </h3>
          <div className="space-y-2">
            {stats.problematic_skills.map((ps) => (
              <div
                key={ps.name}
                className="flex items-center gap-3"
              >
                <span className="text-sm text-gray-700 flex-1">{ps.name}</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-400 h-2 rounded-full"
                    style={{ width: `${(ps.avg_level / 10) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">
                  {ps.avg_level.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
