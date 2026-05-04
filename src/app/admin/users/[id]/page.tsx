"use client";

import { UserDetailPanel } from "@/components/admin/UserDetailPanel";

export default function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const userId = Number(params.id);

  return (
    <div>
      <UserDetailPanel userId={userId} />
    </div>
  );
}
