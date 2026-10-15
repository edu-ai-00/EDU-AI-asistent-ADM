"use client";

import { MentorsSection } from "@/components/admin/MentorsSection";

export default function MentorsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mentoři</h1>
        <p className="mt-1 text-gray-600">
          AI mentoři v chatu — jejich nastavení, kontext pro AI a napojení na RAG
        </p>
      </div>

      <MentorsSection />
    </div>
  );
}
