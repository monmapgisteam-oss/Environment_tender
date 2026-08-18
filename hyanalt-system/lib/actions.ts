"use server";

import { revalidatePath } from "next/cache";
import { readDB, reviewDate, resetDB, writeDB } from "./db";
import { buildViews, runEscalation } from "./escalation";
import { deliver } from "./notify";
import type { MilestoneView, Notification, Settings } from "./types";

function refresh() {
  revalidatePath("/", "layout");
}

/** Хөдөлгүүрийг ажиллуулж, үүссэн мэдэгдлийг хүргэнэ */
async function runAndSave(asOf?: string) {
  const db = await readDB();
  const date = asOf ?? reviewDate(db.settings);
  const result = runEscalation(db, date);
  if (result.created.length) await deliver(result.created);
  await writeDB(db);
  return result;
}

export async function runEngineAction() {
  const r = await runAndSave();
  refresh();
  return { created: r.created.length, received: r.reportsReceived, asOf: r.asOf };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function setReviewDateAction(date: string) {
  // Хагас бөглөсөн эсвэл буруу огноо ирвэл төлөвийг эвдэхгүйгээр буцна
  if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) return;
  const db = await readDB();
  db.settings.reviewDate = date;
  db.settings.useReviewDate = true;
  await writeDB(db);
  await runAndSave(date);
  refresh();
}

export async function markSubmittedAction(milestoneId: string) {
  const db = await readDB();
  const m = db.milestones.find((x) => x.id === milestoneId);
  if (m) {
    m.submittedAt = reviewDate(db.settings);
    m.manual = true;
  }
  await writeDB(db);
  await runAndSave();
  refresh();
}

export async function undoSubmitAction(milestoneId: string) {
  const db = await readDB();
  const m = db.milestones.find((x) => x.id === milestoneId);
  if (m) {
    m.submittedAt = null;
    m.manual = true;
  }
  await writeDB(db);
  await runAndSave();
  refresh();
}

export async function updateSettingsAction(patch: Partial<Settings>) {
  const db = await readDB();
  db.settings = { ...db.settings, ...patch };
  await writeDB(db);
  await runAndSave();
  refresh();
}

/** Нэг үе шатны дэлгэрэнгүй: шатлалын явц болон илгээсэн мэдэгдлийн бичвэр */
export async function getMilestoneDetailAction(
  id: string,
): Promise<{ view: MilestoneView; notifications: Notification[] } | null> {
  const db = await readDB();
  const asOf = reviewDate(db.settings);
  const view = buildViews(db, asOf).find((v) => v.id === id);
  if (!view) return null;
  const notifications = db.notifications
    .filter((n) => n.milestoneId === id && n.dueOn <= asOf)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  return { view, notifications };
}

/** Системийг анхны төлөвт буцаана (бүх мэдэгдэл, бүртгэлийг устгана) */
export async function resetSystemAction() {
  await resetDB();
  await runAndSave();
  refresh();
}
