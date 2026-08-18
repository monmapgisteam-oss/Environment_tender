"use client";

import { Suspense } from "react";
import { TaskExplorer, type Row } from "@/components/TaskExplorer";
import { reviewDate } from "@/lib/seed";
import { useDB } from "@/lib/store";
import { buildViews } from "@/lib/escalation";

export default function TasksPage() {
  const db = useDB();
  const asOf = reviewDate(db.settings);
  const rows: Row[] = buildViews(db, asOf).map((v) => ({
    id: v.id,
    title: v.title,
    companyId: v.companyId,
    companyNo: v.companyNo,
    companyName: v.companyName,
    contractNo: v.contractNo,
    deptId: v.deptId,
    deptName: v.deptName,
    deptHead: v.deptHead,
    stageNo: v.stageNo,
    stageName: v.stageName,
    deadline: v.deadline,
    status: v.status,
    daysLeft: v.daysLeft,
    submittedAt: v.submittedAt,
    lastNoteDate: v.lastNotification?.dueOn ?? null,
    notifiedTo: v.lastNotification?.recipients.map((r) => r.name).join(", ") ?? null,
  }));

  return (
    <main className="page-fill flex min-h-0 flex-1 flex-col gap-3 p-3">
      <Suspense fallback={<p className="card-note">Ачаалж байна…</p>}>
        <TaskExplorer
          rows={rows}
          companies={db.companies.map((c) => ({ id: c.id, no: c.no, name: c.name }))}
          departments={db.departments.map((d) => ({ id: d.id, name: d.name }))}
        />
      </Suspense>
    </main>
  );
}
