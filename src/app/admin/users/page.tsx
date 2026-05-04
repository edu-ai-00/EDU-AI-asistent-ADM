"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bug, Merge } from "lucide-react";
import { UserList } from "@/components/admin/UserList";
import { ClassroomSection } from "@/components/admin/ClassroomSection";
import { TeamSection } from "@/components/admin/TeamSection";
import { MergeUsersDialog } from "@/components/admin/MergeUsersDialog";
import { useAuth } from "@/hooks/useAuth";

function UsersPageContent() {
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "students";
  const [mergeOpen, setMergeOpen] = useState(false);

  // Title/description per tab
  const titles: Record<string, { title: string; desc: string }> = {
    students: { title: "Studenti", desc: "Registrovaní studenti a jejich aktivita" },
    classrooms: { title: "Třídy", desc: "Správa tříd, žáků a přiřazených kurzů" },
    teachers: { title: "Učitelé", desc: "Správa učitelských účtů" },
    admins: { title: "Admini", desc: "Správa administrátorů" },
  };

  const { title, desc } = titles[tab] ?? titles.students;

  return (
    <div>
      <div className="flex items-start justify-between mb-6" data-print-hide>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{desc}</p>
        </div>
        {tab === "students" && (
          <div className="flex items-center gap-2">
            <Link
              href="/admin/debug-reports"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Bug className="w-4 h-4" />
              Diagnostika
            </Link>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setMergeOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Merge className="w-4 h-4" />
                Spojit uživatele
              </button>
            )}
          </div>
        )}
      </div>

      {tab === "students" && <UserList />}
      {tab === "classrooms" && <ClassroomSection />}
      {tab === "teachers" && isAdmin && <TeamSection roleFilter="teacher" />}
      {tab === "admins" && isAdmin && <TeamSection roleFilter="admin" />}

      {isAdmin && (
        <MergeUsersDialog
          open={mergeOpen}
          onClose={() => setMergeOpen(false)}
        />
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense>
      <UsersPageContent />
    </Suspense>
  );
}
