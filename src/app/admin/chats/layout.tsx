"use client";

import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Admin-only, list and detail alike: a teacher no longer has Chaty in the menu
// and the API refuses them (BR-4KPUJQ), so a typed-in or bookmarked URL gets
// this notice instead of a failed request.
export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Chaty</h1>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <Lock className="w-10 h-10 text-gray-300" />
          <p className="text-gray-600">Chaty žáků jsou dostupné jen administrátorům.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
