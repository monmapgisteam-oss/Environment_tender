/**
 * Энгийн файл суурьт өгөгдлийн сан (data/db.json).
 * Бодит нэвтрүүлэлтэд эндхийн readDB/writeDB-г Postgres, MongoDB зэргээр солиход
 * бусад модуль өөрчлөгдөхгүй.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { addDays, hash, today } from "./date";
import { COMPANIES, DEPARTMENTS, MONMAP_STAGES, MONMAP_TASKS, PEOPLE, PROGRAM, splitStages } from "./plan";
import type { Company, DB, Milestone, Settings, Stage, Task } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export const DEFAULT_SETTINGS: Settings = {
  reminderLead: 14,
  finalLead: 3,
  deptHeadAfter: 1,
  directorAfter: 7,
  businessDaysOnly: true,
  useReviewDate: true,
  reviewDate: "2026-08-17",
  demoIncomingReports: true,
  lastRunAt: null,
};

/**
 * Туршилтын өгөгдөл: тайлан хэзээ ирэхийг тогтвортой хэшээр урьдчилан тогтооно.
 * null буцаавал уг үе шатны тайлан огт ирэхгүй — шатлал бүрэн ажиллаж харагдана.
 * Бодит нэвтрүүлэлтэд энэ функцийг устгаад demoArrivesAt-г null болгоно.
 */
function demoArrival(taskId: string, stageNo: number, start: string, end: string): string | null {
  const h = hash(`${taskId}|${stageNo}`);
  const bucket = h % 100;
  const span = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000));
  if (bucket < 58) return addDays(start, Math.round(span * (0.35 + ((h >> 7) & 31) / 100)));
  if (bucket < 74) return addDays(end, 1 + ((h >> 9) & 7));
  return null;
}

export function buildSeed(): DB {
  const companies: Company[] = [];
  const stages: Stage[] = [];
  const tasks: Task[] = [];
  const milestones: Milestone[] = [];

  const addPlan = (company: Company, companyStages: Stage[], plan: { deptId: string; title: string }[]) => {
    companies.push(company);
    stages.push(...companyStages);
    plan.forEach((t, i) => {
      const taskId = `${company.id}-t${i + 1}`;
      tasks.push({ id: taskId, companyId: company.id, deptId: t.deptId, no: i + 1, title: t.title });
      for (const stage of companyStages) {
        milestones.push({
          id: `${taskId}-s${stage.no}`,
          taskId,
          companyId: company.id,
          deptId: t.deptId,
          stageId: stage.id,
          deadline: stage.end,
          submittedAt: null,
          demoArrivesAt: demoArrival(taskId, stage.no, stage.start, stage.end),
        });
      }
    });
  };

  // 1. "Монмэп" ХХК — бодит гэрээ, 5 үе шат
  addPlan(
    {
      id: "monmap",
      no: 1,
      name: '"Монмэп" ХХК',
      contractNo: "НХААГ/20260102029",
      scope: "Байгаль орчны хяналтын нэгдсэн систем",
      start: "2026-06-01",
      end: "2027-02-14",
      deptId: "sam",
      amount: 890,
      pm: { name: "Т. Билгүүнтөгс", role: "ГМС-ийн ерөнхий инженер", org: '"Монмэп" ХХК' },
      ceo: { name: "С. Энх-Амгалан", role: "Гүйцэтгэх захирал", org: '"Монмэп" ХХК' },
    },
    MONMAP_STAGES.map((s) => ({ ...s, companyId: "monmap" })),
    MONMAP_TASKS,
  );

  // 2-20. Бусад гүйцэтгэгчид
  for (const plan of COMPANIES) {
    addPlan(
      {
        id: plan.id,
        no: plan.no,
        name: plan.name,
        contractNo: plan.contractNo,
        scope: plan.scope,
        start: plan.start,
        end: plan.end,
        deptId: plan.deptId,
        amount: plan.amount,
        pm: plan.pm,
        ceo: plan.ceo,
      },
      splitStages(plan.id, plan.start, plan.end, plan.stageNames),
      plan.tasks.map((title) => ({ deptId: plan.deptId, title })),
    );
  }

  return {
    version: 2,
    program: PROGRAM,
    people: PEOPLE,
    companies,
    stages,
    departments: DEPARTMENTS,
    tasks,
    milestones,
    notifications: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export async function readDB(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(raw) as DB;
    if (db.version !== 2) throw new Error("хуучин хувилбар");
    db.settings = { ...DEFAULT_SETTINGS, ...db.settings };
    return db;
  } catch {
    const seed = buildSeed();
    await writeDB(seed);
    return seed;
  }
}

export async function writeDB(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

export async function resetDB(): Promise<DB> {
  const seed = buildSeed();
  await writeDB(seed);
  return seed;
}

/** Хяналтын огноо: тохиргоогоор заасан эсвэл бодит өнөөдөр */
export function reviewDate(settings: Settings): string {
  return settings.useReviewDate ? settings.reviewDate : today();
}
