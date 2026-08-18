/**
 * Мэдэгдэл, шатлан мэдээллэх дүрмийн хөдөлгүүр.
 *
 * Зарчим (Х = үе шатны эцсийн хугацаа):
 *   Х−reminderLead   → Гүйцэтгэгчийн мэргэжилтэнд урьдчилсан сануулга
 *   Х−finalLead      → Гүйцэтгэгчийн төслийн хариуцагчид эцсийн сануулга
 *   Х+deptHeadAfter  → Захиалагчийн холбогдох хэлтсийн даргад (гүйцэтгэгчид хуулбар)
 *   Х+directorAfter  → Зөвхөн газрын даргад
 */
import { addDays, diffDays, formatLong, toBusinessDay } from "./date";
import type {
  Company, DB, Department, LadderStep, Milestone, MilestoneView,
  Notification, Recipient, RuleKey, Settings, Stage, Status, Task,
} from "./types";

export const RULES: {
  key: RuleKey;
  label: string;
  short: string;
  direction: -1 | 1;
  setting: keyof Pick<Settings, "reminderLead" | "finalLead" | "deptHeadAfter" | "directorAfter">;
  audience: string;
  tone: "warn" | "crit" | "sev";
}[] = [
  { key: "reminder", label: "Урьдчилсан сануулга", short: "Сануулга", direction: -1, setting: "reminderLead", audience: "Гүйцэтгэгчийн мэргэжилтэн", tone: "warn" },
  { key: "final", label: "Эцсийн сануулга", short: "Эцсийн сануулга", direction: -1, setting: "finalLead", audience: "Гүйцэтгэгчийн төслийн хариуцагч", tone: "warn" },
  { key: "level2", label: "Хэлтсийн даргад мэдэгдэх", short: "Хэлтсийн дарга", direction: 1, setting: "deptHeadAfter", audience: "Захиалагчийн хэлтсийн дарга (гүйцэтгэгчид хуулбар)", tone: "crit" },
  { key: "level3", label: "Газрын даргад мэдэгдэх", short: "Газрын дарга", direction: 1, setting: "directorAfter", audience: "Зөвхөн газрын дарга", tone: "sev" },
];

export const RULE_BY_KEY = Object.fromEntries(RULES.map((r) => [r.key, r])) as Record<RuleKey, (typeof RULES)[number]>;

export const STATUS_LABEL: Record<Status, string> = {
  planned: "Эхлээгүй",
  active: "Хэрэгжиж буй",
  warn1: "Урьдчилсан сануулга",
  warn2: "Эцсийн сануулга",
  level2: "Хугацаа хэтэрсэн",
  level3: "Ноцтой хоцролт",
  done: "Хугацаандаа ирүүлсэн",
  late: "Хоцорч ирүүлсэн",
};

/** Эрэмбэ: анхаарал шаардсан нь эхэнд */
export const STATUS_RANK: Record<Status, number> = {
  level3: 0, level2: 1, warn2: 2, warn1: 3, active: 4, planned: 5, late: 6, done: 7,
};

/** Мэдэгдэл үүсэх ёстой огноо */
export function triggerDate(deadline: string, rule: RuleKey, s: Settings): string {
  const r = RULE_BY_KEY[rule];
  const raw = addDays(deadline, r.direction * s[r.setting]);
  return s.businessDaysOnly ? toBusinessDay(raw) : raw;
}

export function computeStatus(m: Milestone, stage: Stage, asOf: string, s: Settings): Status {
  if (m.submittedAt && diffDays(m.submittedAt, asOf) <= 0) {
    return diffDays(m.submittedAt, m.deadline) > 0 ? "late" : "done";
  }
  const overdue = diffDays(asOf, m.deadline);
  if (overdue >= s.directorAfter) return "level3";
  if (overdue >= s.deptHeadAfter) return "level2";
  if (overdue > 0) return "warn2";
  if (diffDays(asOf, addDays(m.deadline, -s.finalLead)) >= 0) return "warn2";
  if (diffDays(asOf, addDays(m.deadline, -s.reminderLead)) >= 0) return "warn1";
  if (diffDays(asOf, stage.start) >= 0) return "active";
  return "planned";
}

export function recipientsFor(rule: RuleKey, company: Company, dept: Department, db: DB): Recipient[] {
  // 1. Урьдчилсан сануулга — гүйцэтгэгчийн мэргэжилтэн
  if (rule === "reminder") return [company.specialist ?? company.pm];
  // 2. Эцсийн сануулга — гүйцэтгэгчийн төслийн хариуцагч
  if (rule === "final") return [company.pm];
  // 3. Хугацаа хэтэрсэн — захиалагчийн хэлтсийн дарга (гүйцэтгэгчид хуулбарлана)
  if (rule === "level2") {
    return [
      company.pm,
      { name: dept.head, role: `${dept.name}-ийн дарга`, org: db.program.client, escalated: true },
    ];
  }
  // 4. Ноцтой хоцролт — зөвхөн газрын дарга
  return [{ ...db.people.director, escalated: true }];
}

export function subjectFor(rule: RuleKey, company: Company, stage: Stage, task: Task, s: Settings): string {
  const suffix = `${company.name} · ${stage.no}-р үе шат: ${task.title}`;
  switch (rule) {
    case "reminder": return `Сануулга: хугацаа дуусахад ${s.reminderLead} хоног үлдлээ — ${suffix}`;
    case "final": return `Эцсийн сануулга: хугацаа дуусахад ${s.finalLead} хоног үлдлээ — ${suffix}`;
    case "level2": return `Хугацаа хэтэрсэн: тайлан ирүүлээгүй — ${suffix}`;
    case "level3": return `Ноцтой хоцролт: гэрээт үүргийн биелэлтэд эрсдэл үүслээ — ${suffix}`;
  }
}

export function bodyFor(
  rule: RuleKey, db: DB, company: Company, dept: Department, task: Task, stage: Stage,
  m: Milestone, dueOn: string, s: Settings,
): string {
  const head =
    `Гэрээ: ${company.contractNo} (${company.scope})\n` +
    `Гүйцэтгэгч: ${company.name}\n` +
    `Ажил: ${task.title}\n` +
    `Хариуцах хэлтэс: ${dept.name}\n` +
    `Үе шат: ${stage.no}. ${stage.name}\n` +
    `Эцсийн хугацаа: ${formatLong(m.deadline)}\n\n`;

  if (rule === "reminder" || rule === "final") {
    const left = diffDays(m.deadline, dueOn);
    const to = rule === "reminder" ? (company.specialist ?? company.pm) : company.pm;
    return (
      head +
      `Эрхэм хүндэт ${to.name} та бүхэнд,\n\n` +
      `Дээрх ажлын үе шатны гүйцэтгэлийг хүлээлгэн өгөх хугацаа дуусахад ${left} хоног үлдлээ. ` +
      `Гүйцэтгэлийн тайлан болон холбогдох материалыг товлосон хугацаанд системд ирүүлнэ үү.\n\n` +
      `Хугацаа хэтэрсэн тохиолдолд ${s.deptHeadAfter} хоногийн дараа захиалагч байгууллагын ` +
      `${dept.name}-ийн даргад автоматаар мэдэгдэнэ.`
    );
  }
  if (rule === "level2") {
    return (
      head +
      `Эрхэм хүндэт ${dept.head} даргад,\n\n` +
      `Дээрх ажлын үе шатны эцсийн хугацаа ${formatLong(m.deadline)} дуусгавар болсон боловч ` +
      `гүйцэтгэгч ${company.name}-аас тайлан, материал ирүүлээгүй байна. ` +
      `Хугацаа хэтэрсэн: ${diffDays(dueOn, m.deadline)} хоног.\n\n` +
      `Гүйцэтгэгч байгууллагатай холбогдож хэрэгжилтийн байдлыг тодруулан, шаардлагатай арга хэмжээг авна уу. ` +
      `Хоцролт ${s.directorAfter} хоногт хүрвэл газрын даргад мэдэгдэнэ.`
    );
  }
  return (
    head +
    `Эрхэм хүндэт ${db.people.director.name} даргад,\n\n` +
    `Дээрх ажлын үе шат ${diffDays(dueOn, m.deadline)} хоногоор хугацаа хэтэрч, гэрээт үүргийн ` +
    `биелэлтэд эрсдэл үүслээ. ${dept.name}-ийн дарга ${dept.head}-д ` +
    `${s.directorAfter - s.deptHeadAfter} хоногийн өмнө мэдэгдсэн боловч гүйцэтгэл ирээгүй байна.\n\n` +
    `Гэрээний нөхцөлийн дагуу арга хэмжээ авахыг хүсэв.`
  );
}

export interface RunResult {
  asOf: string;
  created: Notification[];
  reportsReceived: number;
}

/**
 * Хөдөлгүүрийг ажиллуулна: тайлан хүлээн авалтыг бүртгэж, шатлалын дагуу
 * шинээр үүсэх ёстой мэдэгдлүүдийг үүсгэнэ. Давхардахгүй (idempotent).
 */
export function runEscalation(db: DB, asOf: string): RunResult {
  const s = db.settings;
  const stages = new Map(db.stages.map((x) => [x.id, x]));
  const depts = new Map(db.departments.map((x) => [x.id, x]));
  const tasks = new Map(db.tasks.map((x) => [x.id, x]));
  const companies = new Map(db.companies.map((x) => [x.id, x]));
  const seen = new Set(db.notifications.map((n) => `${n.milestoneId}|${n.rule}`));
  const created: Notification[] = [];
  let reportsReceived = 0;

  for (const m of db.milestones) {
    // 1. Тайлан хүлээн авалт (туршилтын горимд дуурайлгана)
    if (s.demoIncomingReports && !m.manual) {
      const arrived = m.demoArrivesAt && diffDays(m.demoArrivesAt, asOf) <= 0 ? m.demoArrivesAt : null;
      if (arrived !== m.submittedAt) {
        if (arrived) reportsReceived++;
        m.submittedAt = arrived;
      }
    }

    // 2. Шатлалын мэдэгдэл
    const stage = stages.get(m.stageId)!;
    const dept = depts.get(m.deptId)!;
    const task = tasks.get(m.taskId)!;
    const company = companies.get(m.companyId)!;
    for (const rule of RULES) {
      const dueOn = triggerDate(m.deadline, rule.key, s);
      if (diffDays(asOf, dueOn) < 0) continue; // хугацаа болоогүй
      if (m.submittedAt && diffDays(m.submittedAt, dueOn) <= 0) continue; // тайлан ирсэн
      const key = `${m.id}|${rule.key}`;
      if (seen.has(key)) continue;
      seen.add(key);
      created.push({
        id: `${m.id}-${rule.key}`,
        milestoneId: m.id,
        companyId: m.companyId,
        rule: rule.key,
        dueOn,
        sentAt: new Date().toISOString(),
        subject: subjectFor(rule.key, company, stage, task, s),
        body: bodyFor(rule.key, db, company, dept, task, stage, m, dueOn, s),
        recipients: recipientsFor(rule.key, company, dept, db),
        channels: ["И-мэйл", "Системийн мэдэгдэл"],
        delivered: false,
      });
    }
  }

  db.notifications.push(...created);
  db.settings.lastRunAt = new Date().toISOString();
  return { asOf, created, reportsReceived };
}

/* ────────── Дэлгэцийн загвар ────────── */

export function buildViews(db: DB, asOf: string): MilestoneView[] {
  const s = db.settings;
  const stages = new Map(db.stages.map((x) => [x.id, x]));
  const depts = new Map(db.departments.map((x) => [x.id, x]));
  const tasks = new Map(db.tasks.map((x) => [x.id, x]));
  const companies = new Map(db.companies.map((x) => [x.id, x]));
  const notesByMilestone = new Map<string, Notification[]>();
  for (const n of db.notifications) {
    if (diffDays(n.dueOn, asOf) > 0) continue; // ирээдүйн мэдэгдлийг харуулахгүй
    const list = notesByMilestone.get(n.milestoneId) ?? [];
    list.push(n);
    notesByMilestone.set(n.milestoneId, list);
  }

  return db.milestones.map((m) => {
    const stage = stages.get(m.stageId)!;
    const dept = depts.get(m.deptId)!;
    const task = tasks.get(m.taskId)!;
    const company = companies.get(m.companyId)!;
    const sent = new Set((notesByMilestone.get(m.id) ?? []).map((n) => n.rule));
    const submitted = m.submittedAt && diffDays(m.submittedAt, asOf) <= 0 ? m.submittedAt : null;

    const steps: LadderStep[] = RULES.map((rule) => {
      const dueOn = triggerDate(m.deadline, rule.key, s);
      let state: LadderStep["state"] = "pending";
      if (sent.has(rule.key)) state = "sent";
      else if (submitted && diffDays(submitted, dueOn) <= 0) state = "skipped";
      return { rule: rule.key, label: rule.label, dueOn, state, recipients: recipientsFor(rule.key, company, dept, db) };
    });

    const history = (notesByMilestone.get(m.id) ?? []).sort((a, b) => a.dueOn.localeCompare(b.dueOn));

    return {
      id: m.id,
      title: task.title,
      group: task.group,
      companyId: company.id,
      companyName: company.name,
      companyNo: company.no,
      contractNo: company.contractNo,
      deptId: dept.id,
      deptName: dept.name,
      deptHead: dept.head,
      stageNo: stage.no,
      stageName: stage.name,
      stageStart: stage.start,
      deadline: m.deadline,
      status: computeStatus(m, stage, asOf, s),
      daysLeft: diffDays(m.deadline, asOf),
      submittedAt: submitted,
      steps,
      lastNotification: history.length ? history[history.length - 1] : null,
    };
  });
}

export function countBy(views: MilestoneView[]): Record<Status, number> {
  const out: Record<Status, number> = {
    planned: 0, active: 0, warn1: 0, warn2: 0, level2: 0, level3: 0, done: 0, late: 0,
  };
  for (const v of views) out[v.status]++;
  return out;
}
