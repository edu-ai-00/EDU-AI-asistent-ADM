"use client";

import { ChatDetail } from "@/components/admin/ChatDetail";

export default function ChatDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const sessionId = Number(params.id);

  return (
    <div>
      <ChatDetail sessionId={sessionId} />
    </div>
  );
}
