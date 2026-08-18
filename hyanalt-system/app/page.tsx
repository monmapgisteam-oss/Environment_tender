"use client";

import { DashboardView, type CompanyRow, type Scope } from "@/components/DashboardView";
import { diffDays, monthEnd, nextMonth } from "@/lib/date";
import { reviewDate } from "@/lib/seed";
import { useDB } from "@/lib/store";
import { buildViews, countBy, STATUS_RANK } from "@/lib/escalation";
import type { Milestone, MilestoneView, Status } from "@/lib/types";

const QUEUE_SHOWN = 5;

export default function DashboardPage() {
  const db = useDB();
  const asOf = reviewDate(db.settings);
  const views = buildViews(db, asOf);

  /* Саруудын тэнхлэг */
  const months: string[] = [];
  for (let m = db.program.start.slice(0, 7); m <= db.program.end.slice(0, 7); m = nextMonth(m)) months.push(m);
  const markerIndex = Math.max(0, months.indexOf(asOf.slice(0, 7)));

  /** Нэг хамрах хүрээний бүх тоог бэлдэнэ */
  const makeScope = (
    id: string,
    label: string,
    sub: string,
    period: string,
    vs: MilestoneView[],
    ms: Milestone[],
    end: string,
    extra?: Partial<Scope>,
  ): Scope => {
    const c = countBy(vs);
    const done = c.done + c.late;
    const warn = c.warn1 + c.warn2;
    const over = c.level2 + c.level3;
    const due = vs.filter((v) => v.daysLeft < 0 || v.submittedAt).length;
    const penalty = c.late + c.level2 * 2 + c.level3 * 4;

    const queueAll = vs
      .filter((v) => ["level3", "level2", "warn2", "warn1"].includes(v.status))
      .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.daysLeft - b.daysLeft);

    const ids = new Set(ms.map((m) => m.id));
    const notesByDay: Record<string, number> = {};
    for (const n of db.notifications) {
      if (n.dueOn <= asOf && ids.has(n.milestoneId)) notesByDay[n.dueOn] = (notesByDay[n.dueOn] ?? 0) + 1;
    }

    return {
      id,
      label,
      sub,
      period,
      total: vs.length,
      done,
      percent: vs.length ? Math.round((done / vs.length) * 100) : 0,
      warn,
      overdue: over,
      level2: c.level2,
      level3: c.level3,
      score: due ? Math.max(0, Math.min(100, Math.round(100 - (penalty / due) * 100))) : 100,
      worstDelay: Math.max(0, ...vs.filter((v) => v.daysLeft < 0 && !v.submittedAt).map((v) => -v.daysLeft)),
      daysToEnd: Math.max(0, diffDays(end, asOf)),
      monthlyPlanned: months.map((mo) => ms.filter((x) => x.deadline <= monthEnd(mo)).length),
      monthlyActual: months.map((mo) => {
        if (`${mo}-01` > asOf) return null;
        const cap = monthEnd(mo) < asOf ? monthEnd(mo) : asOf;
        return ms.filter((x) => x.submittedAt && x.submittedAt <= cap).length;
      }),
      queue: queueAll.slice(0, QUEUE_SHOWN).map((v) => ({
        id: v.id,
        title: v.title,
        companyName: v.companyName,
        deadline: v.deadline,
        daysLeft: v.daysLeft,
        status: v.status,
        escalatedTo:
          v.steps
            .filter((s) => s.state === "sent")
            .at(-1)
            ?.recipients.filter((r) => r.escalated)
            .map((r) => r.name)
            .join(", ") ?? "",
      })),
      queueTotal: queueAll.length,
      donut: [
        { label: "Хүлээн авсан", value: done, color: "var(--ok)" },
        { label: "Хэрэгжиж буй", value: c.active, color: "var(--data)" },
        { label: "Сануулгын бүсэд", value: warn, color: "var(--warn)" },
        { label: "Хугацаа хэтэрсэн", value: over, color: "var(--crit)" },
        { label: "Эхлээгүй", value: c.planned, color: "var(--surface-3)" },
      ],
      notesByDay,
      deadlines: ms.reduce<Record<string, number>>((acc, m) => {
        acc[m.deadline] = (acc[m.deadline] ?? 0) + 1;
        return acc;
      }, {}),
      ...extra,
    };
  };

  const riskyCompanies = db.companies.filter((cmp) =>
    views.some((v) => v.companyId === cmp.id && (v.status === "level2" || v.status === "level3")),
  ).length;

  const scopes: Scope[] = [
    makeScope(
      "all",
      "Бүх гүйцэтгэгч",
      `${db.companies.length} компани`,
      `${db.program.start} → ${db.program.end}`,
      views,
      db.milestones,
      db.program.end,
      { riskyCompanies, companiesCount: db.companies.length },
    ),
    ...db.companies.map((cmp) =>
      makeScope(
        cmp.id,
        `${cmp.no}. ${cmp.name}`,
        cmp.contractNo,
        `${cmp.start} → ${cmp.end}`,
        views.filter((v) => v.companyId === cmp.id),
        db.milestones.filter((m) => m.companyId === cmp.id),
        cmp.end,
      ),
    ),
  ];

  /* Компанийн хүснэгт — зөрчилтэй нь эхэнд */
  const companies: CompanyRow[] = db.companies
    .map((cmp) => {
      const items = views.filter((v) => v.companyId === cmp.id);
      const n = (s: Status) => items.filter((v) => v.status === s).length;
      const done = n("done") + n("late");
      const over = n("level2") + n("level3");
      return {
        id: cmp.id,
        no: cmp.no,
        name: cmp.name,
        demo: Boolean(cmp.demo),
        scope: cmp.scope,
        total: items.length,
        done,
        warn: n("warn1") + n("warn2"),
        over,
        percent: Math.round((done / items.length) * 100),
        doneShare: (done / items.length) * 100,
        overShare: (over / items.length) * 100,
      };
    })
    .sort((a, b) => b.over - a.over || b.warn - a.warn || a.no - b.no);

  return (
    <DashboardView
      scopes={scopes}
      months={months}
      markerIndex={markerIndex}
      reviewDate={asOf}
      companies={companies}
    />
  );
}
