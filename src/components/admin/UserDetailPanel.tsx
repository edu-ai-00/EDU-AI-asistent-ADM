"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Trophy,
  Zap,
  Flame,
  Award,
  BookOpen,
  Timer,
  TrendingUp,
  User as UserIcon,
  ListChecks,
  Brain,
  Pencil,
  School,
  Bookmark,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUsers";
import { useUserEloProfile, useUserEloInteractions } from "@/hooks/useElo";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  formatDate,
  formatSeconds,
  safeParseCourseProgress,
  StatItem,
  TabButton,
  type TabId,
} from "./user-detail/shared";
import { EditUserDialog } from "./user-detail/EditUserDialog";
import { CoursesTab } from "./user-detail/CoursesTab";
import { QuizzesTab } from "./user-detail/QuizzesTab";
import { ProgressTab } from "./user-detail/ProgressTab";
import { SkillsTab } from "./user-detail/SkillsTab";
import { EloTab } from "./user-detail/EloTab";
import { ExercisesTab } from "./user-detail/ExercisesTab";
import { AchievementsTab } from "./user-detail/AchievementsTab";
import { SessionsSection } from "./user-detail/SessionsSection";
import { WorkTimeTab } from "./WorkTimeTab";

export function UserDetailPanel({ userId }: { userId: number }) {
  const { isTeacher } = useAuth();
  const { data: user, isLoading, error } = useUser(userId);
  const { data: eloProfile } = useUserEloProfile(userId);
  const { data: eloInteractions } = useUserEloInteractions(userId);
  const [activeTab, setActiveTab] = useState<TabId>("courses");
  const [editOpen, setEditOpen] = useState(false);

  // Compute ELO summary — prefer profile, fall back to latest interaction snapshot
  const profileElo = eloProfile?.profil_elo;
  const latestSnapshot = eloInteractions?.[0]?.profil_elo_snapshot;
  const eloSource = profileElo?.some((v) => v !== 0) ? profileElo : latestSnapshot;
  const eloValues = eloSource?.filter((v) => v !== 0) ?? [];
  const eloCounts = eloProfile?.profil_pocet ?? [];
  const avgElo = eloValues.length > 0
    ? Math.round(eloValues.reduce((s, v) => s + v, 0) / eloValues.length)
    : null;
  const totalEloInteractions = eloCounts.reduce((s, v) => s + v, 0) || (eloInteractions?.length ?? 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-sm text-gray-500">
          Načítání detailu uživatele...
        </span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="py-4 text-sm text-red-500">
        Nepodařilo se načíst detail uživatele
      </div>
    );
  }

  const coursesEnrolled = user.courses.length;
  const coursesCompleted = user.courses.filter((c) => {
    if (c.status === "completed") return true;
    // Quiz-only courses: count as completed if quiz_completed is set
    const pd = safeParseCourseProgress(c.progress_data);
    const pdLessons = pd?.lessons ? Object.keys(pd.lessons).length : 0;
    const quizOnly = c.only_quiz || (c.total_lessons === 0 || (c.total_lessons == null && pdLessons === 0));
    if (quizOnly && pd?.quiz_completed) return true;
    return false;
  }).length;
  // "Celkový čas": the course-level time_spent_seconds is only ever populated
  // by the app from quiz completions and stays 0 for lessons / web users, so
  // it's almost always empty. Recover the real time from its granular sources —
  // per-quiz and per-lesson — and take the max so we never double-count when
  // the course-level cache *is* set (it mirrors quiz time).
  const courseTime = user.courses.reduce(
    (sum, c) => sum + (c.time_spent_seconds ?? 0),
    0,
  );
  const quizTime = (user.quiz_attempts ?? []).reduce(
    (sum, a) => sum + (a.time_spent_seconds ?? 0),
    0,
  );
  const lessonTime = (user.progress ?? []).reduce(
    (sum, p) => sum + (p.time_spent_seconds ?? 0),
    0,
  );
  const totalTime = Math.max(courseTime, quizTime + lessonTime);
  const avgProgress =
    coursesEnrolled > 0
      ? Math.round(
          user.courses.reduce((sum, c) => {
            const pd = safeParseCourseProgress(c.progress_data);
            const pdLessons = pd?.lessons ? Object.keys(pd.lessons).length : 0;
            const quizOnly = c.only_quiz || (c.total_lessons === 0 || (c.total_lessons == null && pdLessons === 0));
            if (quizOnly && pd?.quiz_completed) return sum + 100;
            return sum + (c.progress_percent ?? 0);
          }, 0) / coursesEnrolled,
        )
      : 0;

  const quizAttempts = user.quiz_attempts;
  const quizCount = quizAttempts?.length ?? 0;
  const progressCount = user.progress?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Top bar — back + name + edit */}
      <div className="flex items-center gap-3 pt-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Uživatelé
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold text-gray-900 truncate">{user.name}</h1>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 px-2.5 py-1.5 rounded-md transition-colors flex-shrink-0 ml-auto"
        >
          <Pencil className="w-3 h-3" />
          Upravit
        </button>
      </div>

      <EditUserDialog
        user={{ id: user.id, name: user.name, email: user.email, role: user.role ?? "student", classroom_id: user.classroom_id }}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      {/* Full-width divider — negative margin to span parent padding */}
      <div className="-mx-6 border-t border-gray-200" />

      {/* User info + stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* User info items */}
        <StatItem label="E-mail" value={user.email || "—"} icon={UserIcon} color="bg-gray-100 text-gray-500" />
        {user.classroom_name ? (
          <StatItem label="Třída" value={user.classroom_name} icon={School} color="bg-blue-50 text-blue-600" />
        ) : (
          <StatItem label="Registrace" value={formatDate(user.created_at)} icon={Clock} color="bg-gray-100 text-gray-500" />
        )}
        {(user.is_guest || (user.role && user.role !== "student")) && (
          <StatItem
            label="Typ"
            value={user.is_guest ? "Host" : user.role === "admin" ? "Admin" : user.role === "teacher" ? "Učitel" : "Student"}
            suffix={user.is_guest && user.device_id ? `${user.device_id.slice(0, 8)}…` : undefined}
            icon={UserIcon}
            color={user.role === "admin" ? "bg-red-50 text-red-600" : user.role === "teacher" ? "bg-indigo-50 text-indigo-600" : "bg-orange-50 text-orange-600"}
          />
        )}
        {user.login_code && (
          <StatItem label="PIN" value={user.login_code} icon={ListChecks} color="bg-gray-100 text-gray-500" />
        )}

        {/* Gamification stats */}
        {user.stats && (
          <>
            <StatItem label="Úroveň" value={user.stats.level} icon={Trophy} color="bg-amber-50 text-amber-600" />
            <StatItem label="XP" value={user.stats.xp_points.toLocaleString()} icon={Zap} color="bg-blue-50 text-blue-600" />
            <StatItem label="Série" value={`${user.stats.streak_days} dní`} icon={Flame} color="bg-orange-50 text-orange-600" />
            <StatItem label="Úspěchy" value={user.stats.achievements_count} icon={Award} color="bg-purple-50 text-purple-600" />
            <StatItem label="Ø ELO" value={avgElo !== null ? `${avgElo}` : "—"} suffix={totalEloInteractions > 0 ? `${totalEloInteractions} int.` : undefined} icon={Brain} color="bg-emerald-50 text-emerald-600" />
          </>
        )}

        {/* Course stats */}
        <StatItem label="Kurzy" value={`${coursesCompleted}/${coursesEnrolled}`} icon={BookOpen} color="bg-gray-100 text-gray-500" />
        <StatItem label="Celkový čas" value={formatSeconds(totalTime || null)} icon={Timer} color="bg-gray-100 text-gray-500" />
        <StatItem label="Ø postup" value={`${avgProgress}%`} icon={TrendingUp} color="bg-gray-100 text-gray-500" />
      </div>

      {/* Tabbed section */}
      <div>
        <div
          role="tablist"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground mb-4"
        >
          <TabButton
            active={activeTab === "courses"}
            onClick={() => setActiveTab("courses")}
            icon={BookOpen}
            label="Kurzy"
            count={coursesEnrolled}
          />
          <TabButton
            active={activeTab === "quizzes"}
            onClick={() => setActiveTab("quizzes")}
            icon={ListChecks}
            label="Kvízy"
            count={quizCount}
          />
          {!isTeacher && (
            <TabButton
              active={activeTab === "progress"}
              onClick={() => setActiveTab("progress")}
              icon={TrendingUp}
              label="Postup"
              count={progressCount}
            />
          )}
          <TabButton
            active={activeTab === "skills"}
            onClick={() => setActiveTab("skills")}
            icon={Award}
            label="Dovednosti"
          />
          {!isTeacher && (
            <TabButton
              active={activeTab === "elo"}
              onClick={() => setActiveTab("elo")}
              icon={Brain}
              label="ELO"
            />
          )}
          {!isTeacher && (
            <TabButton
              active={activeTab === "bookmarks"}
              onClick={() => setActiveTab("bookmarks")}
              icon={Bookmark}
              label="Procvičování"
              count={user.bookmarks?.length ?? 0}
            />
          )}
          <TabButton
            active={activeTab === "achievements"}
            onClick={() => setActiveTab("achievements")}
            icon={Award}
            label="Úspěchy"
            count={user.achievements?.length ?? user.stats?.achievements_count ?? 0}
          />
          <TabButton
            active={activeTab === "work"}
            onClick={() => setActiveTab("work")}
            icon={Clock}
            label="Čas práce"
          />
        </div>
        <div className="pt-4">
          {activeTab === "courses" && (
            <CoursesTab
              courses={user.courses}
              progress={user.progress}
              onSwitchToQuizzes={() => setActiveTab("quizzes")}
              quizAttempts={quizAttempts}
            />
          )}
          {activeTab === "quizzes" && (
            <QuizzesTab attempts={quizAttempts} />
          )}
          {!isTeacher && activeTab === "progress" && (
            <ProgressTab progress={user.progress} />
          )}
          {activeTab === "skills" && <SkillsTab userId={userId} />}
          {!isTeacher && activeTab === "elo" && <EloTab userId={userId} />}
          {!isTeacher && activeTab === "bookmarks" && (
            <ExercisesTab
              bookmarks={user.bookmarks ?? []}
              courses={user.courses}
              practiceReviews={user.practice_reviews ?? []}
            />
          )}
          {activeTab === "achievements" && (
            <AchievementsTab
              achievements={user.achievements ?? []}
              achievementsCount={user.stats?.achievements_count ?? 0}
            />
          )}
          {activeTab === "work" && <WorkTimeTab userId={userId} />}
        </div>
      </div>

      {/* Sessions — collapsed by default */}
      <SessionsSection sessions={user.sessions} />
    </div>
  );
}
