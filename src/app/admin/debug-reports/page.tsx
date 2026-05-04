"use client";

import { DebugReportsSection } from "@/components/admin/DebugReportsSection";

export default function DebugReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Diagnostika</h1>
        <p className="text-gray-600 mt-1">
          Debug reporty z mobilní aplikace
        </p>
      </div>

      <DebugReportsSection />
    </div>
  );
}
