"use client";

import { useCourses } from "@/hooks/useCourses";
import { useUsers } from "@/hooks/useUsers";
import { Users, BookOpen, Globe, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export function StatsOverview() {
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: users, isLoading: usersLoading } = useUsers();

  const isLoading = coursesLoading || usersLoading;

  const totalCourses = courses?.length ?? 0;
  const publishedCourses = courses?.filter((c) => c.status === "published").length ?? 0;
  const draftCourses = courses?.filter((c) => c.status === "draft").length ?? 0;
  const totalUsers = users?.meta.total ?? 0;

  const stats: StatCardProps[] = [
    {
      label: "Uživatelé",
      value: isLoading ? "..." : totalUsers,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Kurzy celkem",
      value: isLoading ? "..." : totalCourses,
      icon: BookOpen,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Publikované",
      value: isLoading ? "..." : publishedCourses,
      icon: Globe,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Koncepty",
      value: isLoading ? "..." : draftCourses,
      icon: FileText,
      color: "bg-yellow-50 text-yellow-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
