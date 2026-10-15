"use client";

import { Suspense } from "react";
import { AuditLogSection } from "@/components/admin/AuditLogSection";

// Admin-only: the section itself renders a notice for a teacher and never
// fires the request. It reads its filters from the URL, so it sits in a
// Suspense boundary like the users page.
export default function AuditLogPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit log</h1>
        <p className="text-gray-600 mt-1">
          Kdo, kdy a co změnil — třídy, školy, uživatelé, kurzy, exporty a souhlasy rodičů
        </p>
      </div>

      <Suspense>
        <AuditLogSection />
      </Suspense>
    </div>
  );
}
