"use client";

import { NotificationTypeDetail } from "@/components/admin/notifications/NotificationTypeDetail";

export default function NotificationTypePage({
  params,
}: {
  params: { id: string };
}) {
  const typeId = Number(params.id);

  return (
    <div>
      <NotificationTypeDetail typeId={typeId} />
    </div>
  );
}
