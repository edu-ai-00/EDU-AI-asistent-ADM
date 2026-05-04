"use client";

import { ChatList } from "@/components/admin/ChatList";

export default function ChatsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chaty</h1>
        <p className="text-gray-600 mt-1">
          Chatové relace studentů s AI a učiteli
        </p>
      </div>

      <ChatList />
    </div>
  );
}
