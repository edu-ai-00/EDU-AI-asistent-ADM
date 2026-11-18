"use client";

import { NotificationRuleEditor } from "@/components/admin/notifications/NotificationRuleEditor";

export default function NotificationRulePage({
  params,
}: {
  params: { id: string };
}) {
  const ruleId = Number(params.id);

  return (
    <div>
      <NotificationRuleEditor ruleId={ruleId} />
    </div>
  );
}
