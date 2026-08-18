import { SettingsForm } from "@/components/SettingsForm";
import { readDB, reviewDate } from "@/lib/db";
import { buildViews } from "@/lib/escalation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = await readDB();
  const asOf = reviewDate(db.settings);
  const views = buildViews(db, asOf);
  const depts = new Map(db.departments.map((d) => [d.id, d]));

  return (
    <main className="page-fill grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 xl:grid-cols-2 xl:overflow-hidden">
      <div className="flex min-h-0 flex-col gap-3">
        <SettingsForm settings={db.settings} />

        <section className="card min-h-0 flex-1">
          <div className="card-head">
            <h2 className="card-title">Хэлтсийн дарга нар</h2>
            <span className="card-note">3-р шатны мэдэгдлийг хүлээн авна</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3.5">
            <ul className="flex flex-col gap-1">
              {db.departments.map((d) => {
                const over = views.filter(
                  (v) => v.deptId === d.id && (v.status === "level2" || v.status === "level3"),
                ).length;
                return (
                  <li key={d.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px]">{d.head}</div>
                      <div className="truncate text-[10.5px] text-ink-3">{d.name}</div>
                    </div>
                    <span className="num text-[10.5px]" style={{ color: over ? "var(--crit)" : "var(--ink-3)" }}>
                      {over ? `${over} зөрчил` : "зөрчилгүй"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        <section className="card min-h-0 flex-1">
          <div className="card-head">
            <h2 className="card-title">Гүйцэтгэгч компаниуд</h2>
            <span className="card-note">{db.companies.length} гэрээ · мэдэгдэл хүлээн авах хүмүүс</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3.5">
            <ul className="flex flex-col gap-1">
              {db.companies.map((c) => (
                <li key={c.id} className="rounded-lg border border-line bg-surface-2 px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="num text-[10.5px] text-ink-3">{c.no}.</span>
                    <b className="text-[12px] font-medium">{c.name}</b>
                    <span className="num ml-auto text-[10px] text-ink-3">{c.contractNo}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[10.5px] text-ink-3">
                    {c.scope} · хариуцах: {depts.get(c.deptId)?.name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10.5px] text-ink-2">
                    <span>
                      <span className="text-ink-3">1-3 шат:</span> {c.pm.name}
                    </span>
                    <span>
                      <span className="text-ink-3">4-р шат:</span> {c.ceo.name}
                    </span>
                    <span className="num ml-auto text-ink-3">
                      {c.start} → {c.end}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card flex-none">
          <div className="card-head">
            <h2 className="card-title">Автомат ажиллагаа</h2>
            <span className="card-note">хуваарьт даалгавраас дуудах цэг</span>
          </div>
          <div className="px-3.5 pb-3.5">
            <pre className="num overflow-x-auto rounded-lg border border-line bg-surface-2 p-3 text-[11px] leading-relaxed text-ink-2">
{`# Өдөр бүр (Windows Task Scheduler / cron)
curl -X POST http://localhost:3000/api/escalate

# Тодорхой огноогоор шалгах
curl "http://localhost:3000/api/escalate?date=2026-09-08"`}
            </pre>
            <p className="card-note mt-2">
              Бүх гүйцэтгэгчийн ажлыг нэг дуудалтаар шалгана. И-мэйл, вебхүкийн тохиргоог .env.local файлд заана.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
