"use client";

import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Admin-only, catalogue and detail alike: a teacher has no Dovednosti in the
// menu and the API refuses them (BR-JQMYFT), so a typed-in or bookmarked URL
// gets this notice instead of a page that stays silently empty.
export default function VectorsLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dovednosti</h1>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <Lock className="w-10 h-10 text-gray-300" />
          <p className="text-gray-600">Vektory dovedností spravují jen administrátoři.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
