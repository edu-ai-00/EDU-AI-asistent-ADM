"use client";

import { FeedbackSection } from "@/components/admin/FeedbackSection";

export default function FeedbackPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Zpětná vazba</h1>
        <p className="text-gray-600 mt-1">
          Zpětná vazba od uživatelů k obsahu
        </p>
      </div>

      <FeedbackSection />
    </div>
  );
}
