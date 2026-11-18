"use client";

import { Suspense } from "react";
import { NotificationBroadcastEditor } from "@/components/admin/notifications/NotificationBroadcastEditor";

// The editor reads `?confirm=1` (set right after „Uložit a odeslat“ created
// the draft), so it sits in a Suspense boundary.
export default function NotificationBroadcastPage({
  params,
}: {
  params: { id: string };
}) {
  const broadcastId = Number(params.id);

  return (
    <div>
      <Suspense>
        <NotificationBroadcastEditor broadcastId={broadcastId} />
      </Suspense>
    </div>
  );
}
