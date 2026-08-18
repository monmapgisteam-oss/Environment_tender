import { NoteFeed, type FeedItem } from "@/components/NoteFeed";
import { diffDays } from "@/lib/date";
import { readDB, reviewDate } from "@/lib/db";
import type { RuleKey } from "@/lib/types";

export const dynamic = "force-dynamic";

const SHOW = 250;

export default async function NotificationsPage() {
  const db = await readDB();
  const asOf = reviewDate(db.settings);
  const tasks = new Map(db.tasks.map((t) => [t.id, t]));
  const stages = new Map(db.stages.map((s) => [s.id, s]));
  const companies = new Map(db.companies.map((c) => [c.id, c]));
  const milestones = new Map(db.milestones.map((m) => [m.id, m]));

  const sent = db.notifications
    .filter((n) => n.dueOn <= asOf)
    .sort((a, b) => b.dueOn.localeCompare(a.dueOn) || a.rule.localeCompare(b.rule));

  const count = (rule: RuleKey) => sent.filter((n) => n.rule === rule).length;

  const items: FeedItem[] = sent.slice(0, SHOW).map((n) => {
    const m = milestones.get(n.milestoneId)!;
    const stage = stages.get(m.stageId)!;
    const cmp = companies.get(m.companyId)!;
    return {
      id: n.id,
      milestoneId: n.milestoneId,
      companyId: cmp.id,
      companyName: cmp.name,
      companyNo: cmp.no,
      rule: n.rule,
      dueOn: n.dueOn,
      taskTitle: tasks.get(m.taskId)?.title ?? "",
      stageNo: stage.no,
      deadline: m.deadline,
      overdueDays: Math.max(0, diffDays(n.dueOn, m.deadline)),
      recipients: n.recipients.map((r) => r.name),
      escalatedTo: n.recipients.filter((r) => r.escalated).map((r) => r.name),
    };
  });

  const s = db.settings;

  return (
    <main className="page-fill flex min-h-0 flex-1 flex-col gap-3 p-3">
      {/* Шатлалын тайлбар — юу нь юу болохыг нэг харцаар */}
      <section className="grid flex-none grid-cols-2 gap-3 lg:grid-cols-4">
        <Step no="1" title="Урьдчилсан сануулга" when={`Хугацаа дуусахаас ${s.reminderLead} хоногийн өмнө`} to="Гүйцэтгэгч компанид" value={count("reminder")} color="var(--warn)" />
        <Step no="2" title="Эцсийн сануулга" when={`Хугацаа дуусахаас ${s.finalLead} хоногийн өмнө`} to="Гүйцэтгэгч компанид" value={count("final")} color="var(--warn)" />
        <Step no="3" title="Хэлтсийн даргад" when={`Хугацаа хэтэрснээс ${s.deptHeadAfter} хоногийн дараа`} to="Захиалагчийн хэлтсийн даргад" value={count("level2")} color="var(--crit)" />
        <Step no="4" title="Газрын даргад" when={`Хугацаа хэтэрснээс ${s.directorAfter} хоногийн дараа`} to="Газрын дарга, гүйцэтгэх захиралд" value={count("level3")} color="var(--sev)" />
      </section>

      <NoteFeed
        items={items}
        total={sent.length}
        companies={db.companies.map((c) => ({ id: c.id, no: c.no, name: c.name }))}
      />
    </main>
  );
}

function Step({
  no,
  title,
  when,
  to,
  value,
  color,
}: {
  no: string;
  title: string;
  when: string;
  to: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className="num grid size-5 place-items-center rounded-md text-[10px] font-semibold"
          style={{ background: "var(--surface-3)", color }}
        >
          {no}
        </span>
        <span className="text-[12px] font-medium">{title}</span>
        <span className="stat ml-auto text-[19px]">{value}</span>
      </div>
      <div className="mt-1.5 text-[10.5px] text-ink-3">{when}</div>
      <div className="text-[10.5px] text-ink-2">{to}</div>
    </div>
  );
}
