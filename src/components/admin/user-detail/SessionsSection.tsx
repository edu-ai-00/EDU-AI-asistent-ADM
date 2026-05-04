"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { UserSessionInfo } from "@/types/api";
import { formatDate } from "./shared";

export function SessionsSection({ sessions }: { sessions: UserSessionInfo[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-gray-400">
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        Poslední relace ({sessions.length})
      </button>

      {isOpen && (
        <div className="mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                <th className="pb-2 pr-4">Poslední aktivita</th>
                <th className="pb-2 pr-4">IP adresa</th>
                <th className="pb-2">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">
                    {formatDate(session.last_activity)}
                  </td>
                  <td className="py-2 pr-4 text-gray-700 font-mono text-xs">
                    {session.ip_address ?? "-"}
                  </td>
                  <td className="py-2 text-gray-500 text-xs truncate max-w-xs">
                    {session.user_agent ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
