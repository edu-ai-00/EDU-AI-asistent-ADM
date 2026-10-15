"use client";

import { AvatarItemManager } from "@/components/admin/AvatarItemManager";

export default function AvatarPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Avatar</h1>
        <p className="text-gray-600 mt-1">
          Katalog doplňků do obchodu. Předměty označené hvězdičkou tvoří základního
          avatara, který je zdarma pro všechny.
        </p>
      </div>

      <AvatarItemManager />
    </div>
  );
}
