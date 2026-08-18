"use client";

import { Suspense } from "react";
import { TaskExplorer, type Row, type StageInfo } from "@/components/TaskExplorer";
import { buildViews } from "@/lib/escalation";
import { reviewDate } from "@/lib/seed";
import { useDB } from "@/lib/store";

/** Ажлын жагсаалт нь бодит гэрээ — "Монмэп" ХХК-ийн төлөвлөгөөг харуулна */
const COMPANY_ID = "monmap";

export default function TasksPage() {
  const db = useDB();
  const asOf = reviewDate(db.settings);
  const company = db.companies.find((c) => c.id === COMPANY_ID)!;

  const rows: Row[] = buildViews(db, asOf)
    .filter((v) => v.companyId === COMPANY_ID)
    .map((v) => ({
      id: v.id,
      title: v.title,
      group: v.group,
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

  const stages: StageInfo[] = db.stages
    .filter((s) => s.companyId === COMPANY_ID)
    .map((s) => ({ no: s.no, name: s.name, start: s.start, end: s.end }))
    .sort((a, b) => a.no - b.no);

  return (
    <main className="page-fill flex min-h-0 flex-1 flex-col gap-3 p-3">
      <Suspense fallback={<p className="card-note">Ачаалж байна…</p>}>
        <TaskExplorer rows={rows} stages={stages} companyName={company.name} contractNo={company.contractNo} />
      </Suspense>
    </main>
  );
}
