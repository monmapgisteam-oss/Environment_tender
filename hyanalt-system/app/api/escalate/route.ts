/**
 * Хуваарьт ажиллах цэг. Өдөр бүр нэг удаа дуудахад хангалттай.
 *   Windows Task Scheduler:  curl -X POST http://localhost:3000/api/escalate
 *   Vercel Cron (vercel.json): { "crons": [{ "path": "/api/escalate", "schedule": "0 1 * * *" }] }
 *
 * CRON_SECRET орчны хувьсагч тохируулсан бол Authorization: Bearer <secret> шаардана.
 */
import { NextResponse } from "next/server";
import { readDB, reviewDate, writeDB } from "@/lib/db";
import { runEscalation } from "@/lib/escalation";
import { deliver } from "@/lib/notify";

export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Зөвшөөрөлгүй хандалт" }, { status: 401 });
  }

  const url = new URL(req.url);
  const db = await readDB();
  const asOf = url.searchParams.get("date") ?? reviewDate(db.settings);

  const result = runEscalation(db, asOf);
  const delivered = result.created.length ? await deliver(result.created) : 0;
  await writeDB(db);

  return NextResponse.json({
    asOf,
    reportsReceived: result.reportsReceived,
    notificationsCreated: result.created.length,
    delivered,
    breakdown: result.created.reduce<Record<string, number>>((acc, n) => {
      acc[n.rule] = (acc[n.rule] ?? 0) + 1;
      return acc;
    }, {}),
    notifications: result.created.map((n) => ({
      rule: n.rule,
      dueOn: n.dueOn,
      subject: n.subject,
      to: n.recipients.map((r) => r.name),
    })),
  });
}

export const GET = handle;
export const POST = handle;
