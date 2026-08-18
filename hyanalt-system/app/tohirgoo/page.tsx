"use client";

import { SettingsForm } from "@/components/SettingsForm";
import { reviewDate } from "@/lib/seed";
import { useDB } from "@/lib/store";
import { buildViews } from "@/lib/escalation";

export default function SettingsPage() {
  const db = useDB();
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
                    {c.demo && <span className="text-[9.5px] text-ink-3">жишээ өгөгдөл</span>}
                    <span className="num ml-auto text-[10px] text-ink-3">{c.contractNo}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[10.5px] text-ink-3">
                    {c.scope} · хариуцах: {depts.get(c.deptId)?.name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10.5px] text-ink-2">
                    <span>
                      <span className="text-ink-3">1-р шат:</span> {(c.specialist ?? c.pm).name}
                    </span>
                    <span>
                      <span className="text-ink-3">2-3 шат:</span> {c.pm.name}
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
            <h2 className="card-title">Хөдөлгүүр хэрхэн ажиллах вэ</h2>
            <span className="card-note">энэ хувилбарт хөтөч дээр тооцогдоно</span>
          </div>
          <div className="flex flex-col gap-2 px-3.5 pb-3.5 text-[11.5px] text-ink-2">
            <p className="m-0">
              Хуудсыг нээх бүрд болон дээд мөрний шинэчлэх товч дарахад шатлан мэдээллэх дүрэм
              бүх 763 хяналтын цэг дээр дахин тооцогдож, хугацаа хэтэрсэн ажлуудад мэдэгдэл үүснэ.
            </p>
            <p className="m-0">
              Таны хийсэн өөрчлөлт (хяналтын огноо, дүрмийн хоног, гараар бүртгэсэн тайлан) зөвхөн
              таны хөтөч дээр хадгалагдана. Бусад хүнд нөлөөлөхгүй, «Системийг шинээр эхлүүлэх»
              товчоор анхны төлөвт буцаана.
            </p>
            <p className="m-0 text-ink-3">
              И-мэйл автоматаар илгээх, бүх хэрэглэгчид нэг нийтлэг өгөгдөлтэй байхыг хүсвэл
              системийг байгууллагын сервер дээр байршуулна (README-гээс үзнэ үү).
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
