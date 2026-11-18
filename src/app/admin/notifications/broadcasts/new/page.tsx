"use client";

import { Suspense } from "react";
import { NotificationBroadcastEditor } from "@/components/admin/notifications/NotificationBroadcastEditor";

export default function NewNotificationBroadcastPage() {
  return (
    <div>
      <Suspense>
        <NotificationBroadcastEditor broadcastId={null} />
      </Suspense>
    </div>
  );
}
