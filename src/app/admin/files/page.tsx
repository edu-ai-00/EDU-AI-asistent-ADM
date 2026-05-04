"use client";

import { FileManager } from "@/components/admin/FileManager";

export default function FilesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Soubory</h1>
        <p className="text-gray-600 mt-1">
          Správa obrázků, audia a videa pro kurzy
        </p>
      </div>

      <FileManager />
    </div>
  );
}
