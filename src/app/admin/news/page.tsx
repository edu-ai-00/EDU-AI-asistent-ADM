"use client";

import { NewsSection } from "@/components/admin/NewsSection";

export default function NewsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novinky</h1>
        <p className="text-gray-600 mt-1">
          Novinky pro uživatele aplikace
        </p>
      </div>

      <NewsSection />
    </div>
  );
}
