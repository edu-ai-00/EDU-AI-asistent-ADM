"use client";

import Link from "next/link";
import {
  BookOpen, Clock, FileText, MoreVertical, Trash2, Upload, Edit, Globe,
  Code, BarChart3, KeyRound, Zap, Ban, RotateCcw, ChevronRight, Lock,
  CheckCircle, CheckCircle2, FileEdit, HelpCircle, EyeOff, Download,
  Layers, Users, Hash, User,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Course } from "@/types/api";
import { cn } from "@/lib/utils";

const ALL_STATUSES = [
  { value: "draft" as const, label: "Draft", icon: FileEdit, color: "text-yellow-600" },
  { value: "private" as const, label: "Private", icon: EyeOff, color: "text-purple-600" },
  { value: "locked" as const, label: "Locked", icon: Lock, color: "text-gray-600" },
  { value: "approved" as const, label: "Approved", icon: CheckCircle2, color: "text-blue-600" },
  { value: "published" as const, label: "Published", icon: Globe, color: "text-green-600" },
];

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400" },
  private: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  locked: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  approved: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  published: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-400" },
};

interface CourseCardProps {
  course: Course;
  gpfVectorName?: string;
  onDelete?: (courseId: number) => void;
  onUploadNewVersion?: (course: Course) => void;
  onEdit?: (course: Course) => void;
  onStatusChange?: (course: Course, status: Course["status"]) => void;
  onRestore?: (course: Course) => void;
  onExport?: (course: Course) => void;
}

export function CourseCard({ course, gpfVectorName, onDelete, onUploadNewVersion, onEdit, onStatusChange, onRestore, onExport }: CourseCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDeleted = !!course.deleted_at;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setShowStatusSubmenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMenu = () => {
    setIsMenuOpen(false);
    setShowStatusSubmenu(false);
  };

  const style = statusStyles[course.status] ?? statusStyles.draft;

  return (
    <div className={cn(
      "bg-white rounded-lg border shadow-sm transition-shadow hover:shadow-md",
      isDeleted ? "border-red-200 opacity-60" : "border-gray-200"
    )}>
      <div className="p-5">
        {/* Header: title + status + menu */}
        <div className="flex items-start gap-4">
          {/* Emoji avatar */}
          <div className="shrink-0 w-11 h-11 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xl">
            {course.emoji || "📚"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className={cn("text-base font-semibold leading-tight line-clamp-1", isDeleted ? "text-gray-400" : "text-gray-900")}>
                  {course.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span className="font-mono">{course.course_id}</span>
                  <span>·</span>
                  <span>v{course.version}</span>
                  {course.author && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <User className="w-3 h-3" />
                        {course.author}
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span className="uppercase">{course.language}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Status pill */}
                {isDeleted ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    smazáno
                  </span>
                ) : (
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full capitalize", style.bg, style.text)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                    {course.status}
                  </span>
                )}

                {/* Menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => { setIsMenuOpen(!isMenuOpen); setShowStatusSubmenu(false); }}
                    className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      {isDeleted ? (
                        <>
                          <button
                            onClick={() => { closeMenu(); onRestore?.(course); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Obnovit
                          </button>
                          <div className="px-4 py-2 text-xs text-gray-400">
                            Smazáno {new Date(course.deleted_at!).toLocaleDateString()}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="relative">
                            <button
                              onClick={() => setShowStatusSubmenu(!showStatusSubmenu)}
                              className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <span className="flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Změnit stav
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            {showStatusSubmenu && (
                              <div className="absolute left-full top-0 ml-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                {ALL_STATUSES.map((s) => (
                                  <button
                                    key={s.value}
                                    disabled={s.value === course.status}
                                    onClick={() => { closeMenu(); onStatusChange?.(course, s.value); }}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                                      s.value === course.status
                                        ? "text-gray-300 cursor-default"
                                        : `${s.color} hover:bg-gray-50`
                                    )}
                                  >
                                    <s.icon className="w-4 h-4" />
                                    {s.label}
                                    {s.value === course.status && (
                                      <span className="ml-auto text-xs text-gray-300">aktuální</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="border-t border-gray-100 my-1" />
                          <button onClick={() => { closeMenu(); onEdit?.(course); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Edit className="w-4 h-4" />
                            Upravit verzi
                          </button>
                          <button onClick={() => { closeMenu(); onUploadNewVersion?.(course); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Upload className="w-4 h-4" />
                            Nahrát novou verzi
                          </button>
                          <Link href={`/admin/courses/${course.id}/results`} onClick={closeMenu} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <BarChart3 className="w-4 h-4" />
                            Výsledky
                          </Link>
                          <Link href={`/admin/courses/${course.id}/skills`} onClick={closeMenu} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Layers className="w-4 h-4" />
                            Dovednosti
                          </Link>
                          <Link href={`/admin/courses/${course.id}/json`} onClick={closeMenu} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Code className="w-4 h-4" />
                            Zobrazit JSON
                          </Link>
                          <button onClick={() => { closeMenu(); onExport?.(course); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Download className="w-4 h-4" />
                            Export ELO CSV
                          </button>
                          <div className="border-t border-gray-100 my-1" />
                          <button onClick={() => { closeMenu(); onDelete?.(course.id); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                            Smazat
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {course.description && (
          <p className={cn("text-sm mt-3 line-clamp-2 leading-relaxed", isDeleted ? "text-gray-400" : "text-gray-500")}>
            {course.description}
          </p>
        )}

        {/* Stats row */}
        <div className={cn("flex items-center gap-5 mt-4 text-sm", isDeleted ? "text-gray-400" : "text-gray-500")}>
          {course.lesson_count !== null && (
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <span>{course.lesson_count} lekcí</span>
            </div>
          )}
          {course.estimated_minutes !== null && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{course.estimated_minutes} min</span>
            </div>
          )}
          {course.file_size !== null && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gray-400" />
              <span>{Math.round(course.file_size / 1024)} KB</span>
            </div>
          )}
          {course.users_count != null && course.users_count > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-400" />
                <span>{course.users_count} uživatelů</span>
              </div>
              {course.completed_count != null && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span>
                    {course.completed_count} dokončilo
                    {course.users_count > 0 && (
                      <span className="text-gray-400"> ({Math.round(course.completed_count / course.users_count * 100)}%)</span>
                    )}
                  </span>
                </div>
              )}
              {course.avg_progress != null && (
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span>∅ {Math.round(course.avg_progress)}%</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tags & metadata footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 gap-3">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {course.code && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-mono">
                <KeyRound className="w-3 h-3" />
                PIN {course.code}
              </span>
            )}
            {gpfVectorName && (
              <span className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded" title={`GPF vektor: ${gpfVectorName}`}>
                <Layers className="w-3 h-3" />
                {gpfVectorName}
              </span>
            )}
            {course.starts_with_quiz && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded" title="Začíná diagnostickým kvízem">
                <Zap className="w-3 h-3" />
                Quiz
              </span>
            )}
            {course.only_once && (
              <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded" title="Nelze se vrátit po dokončení">
                <Ban className="w-3 h-3" />
                Once
              </span>
            )}
            {course.logged_only && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded" title="Pouze pro přihlášené">
                <Lock className="w-3 h-3" />
                Login
              </span>
            )}
            {course.quiz_evaluate && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded" title="Kvíz zobrazuje hodnocení">
                <CheckCircle className="w-3 h-3" />
                Eval
              </span>
            )}
            {course.only_quiz && (
              <span className="inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded" title="Kurz běží pouze jako kvíz">
                <HelpCircle className="w-3 h-3" />
                Quiz Only
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
            <span title="Vytvořeno">
              {new Date(course.created_at).toLocaleDateString()}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1" title="Aktualizováno">
              <Clock className="w-3 h-3" />
              {new Date(course.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
