"use client";

import Link from "next/link";
import { useState } from "react";
import { Calendar } from "@/components/Calendar";
import { Donut } from "@/components/charts";
import { IconAlert, IconCheck } from "@/components/icons";
import { ProgressCard } from "@/components/ProgressCard";
import { StatusPill } from "@/components/StatusPill";
import type { Status } from "@/lib/types";

/** Нэг хамрах хүрээ: "Бүх гүйцэтгэгч" эсвэл нэг компани */
export interface Scope {
  id: string;
  label: string;
  /** Гэрээний дугаар эсвэл компанийн тоо */
  sub: string;
  period: string;

  total: number;
  done: number;
  percent: number;
  warn: number;
  overdue: number;
  level2: number;
  level3: number;
  /** Сануулга/хоцролт хэний талд байгаагаар нь задалсан тоо */
  warnClient: number;
  warnVendor: number;
  overdueClient: number;
  overdueVendor: number;
  /** Хамгийн ойрын эцсийн хугацаа ба түүнд үлдсэн хоног */
  nextDeadline: string | null;
  nextDeadlineDays: number;
  score: number;
  worstDelay: number;
  daysToEnd: number;
  /** Зөвхөн "Бүх гүйцэтгэгч" хамрах хүрээнд */
  riskyCompanies?: number;
  companiesCount?: number;

  monthlyPlanned: number[];
  monthlyActual: (number | null)[];

  queue: QueueItem[];
  queueTotal: number;
  donut: { label: string; value: number; color: string }[];
  notesByDay: Record<string, number>;
  /** Эцсийн хугацаа тохиох өдөр → тухайн өдөр дуусах ажлын тоо */
  deadlines: Record<string, number>;
}

export interface QueueItem {
  id: string;
  title: string;
  companyName: string;
  deadline: string;
  daysLeft: number;
  status: Status;
  escalatedTo: string;
}

export interface CompanyRow {
  id: string;
  no: number;
  name: string;
  demo: boolean;
  scope: string;
  total: number;
  done: number;
  warn: number;
  over: number;
  percent: number;
  /** Хувиар: ирүүлсэн ба хугацаа хэтэрсэн хэсэг */
  doneShare: number;
  overShare: number;
}

export function DashboardView({
  scopes,
  months,
  markerIndex,
  reviewDate,
  companies,
}: {
  scopes: Scope[];
  months: string[];
  markerIndex: number;
  reviewDate: string;
  companies: CompanyRow[];
}) {
  // Сонголт зөвхөн энэ дэлгэцэд хадгалагдана — хуудсыг дахин ачаалахад "Бүгд" рүү буцна
  const [pick, setPick] = useState("all");
  const s = scopes.find((x) => x.id === pick) ?? scopes[0];
  const isAll = s.id === "all";
  const taskHref = (extra: string) => (isAll ? `/ajil?${extra}` : `/ajil?company=${s.id}&${extra}`);

  return (
    <main className="dash-grid min-h-0 flex-1 p-3">
      {/* Анхааруулгын мөр — сонгосон хамрах хүрээгээр */}
      {s.overdue > 0 ? (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3.5 py-2.5"
          style={{ borderColor: "var(--crit)", background: "var(--crit-soft)" }}
        >
          <IconAlert className="size-4 flex-none text-crit" />
          <b className="text-[13px] text-crit">
            {isAll ? "" : `${s.label} — `}
            {s.overdue} ажлын хугацаа хэтэрсэн
          </b>
          <span className="text-[12px] text-ink-2">
            Мэдэгдэл явсан: <b className="font-semibold">{s.overdueClient}</b> НБОГ-ын хүмүүст,{" "}
            <b className="font-semibold">{s.overdueVendor}</b> гүйцэтгэгчид · хамгийн их хоцролт{" "}
            <span className="num">{s.worstDelay}</span> хоног
            {isAll && ` · ${s.riskyCompanies} гүйцэтгэгчид зөрчилтэй`}
          </span>
          <Link href={taskHref("status=overdue")} className="ml-auto text-[12px] text-crit">
            Жагсаалтыг харах →
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface px-3.5 py-2.5">
          <IconCheck className="size-4 flex-none text-ok" />
          <b className="text-[13px]">
            {isAll ? "" : `${s.label} — `}хугацаа хэтэрсэн ажил алга
          </b>
          <span className="text-[12px] text-ink-2">
            {s.nextDeadline ? (
              <>
                Дараагийн эцсийн хугацаа <span className="num">{s.nextDeadline}</span> —{" "}
                <span className="num">{s.nextDeadlineDays}</span> хоног үлдлээ.{" "}
              </>
            ) : null}
            {s.warn > 0 ? (
              <>
                Сануулга илгээсэн: <b className="font-semibold">{s.warnClient}</b> ажлаар НБОГ-ын хүмүүст,{" "}
                <b className="font-semibold">{s.warnVendor}</b> ажлаар гүйцэтгэгчид.
              </>
            ) : (
              "Сануулга илгээх шаардлагатай ажил алга."
            )}
          </span>
          <Link href={taskHref("status=attn")} className="ml-auto text-[12px] text-ink-3 hover:text-ink-2">
            Жагсаалтыг харах →
          </Link>
        </div>
      )}

      {/* Үзүүлэлтийн мөр */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Нийт гүйцэтгэл" value={`${s.percent}%`} note={`${s.done} / ${s.total} үе шат`} />
        <Kpi
          label="Хугацаа хэтэрсэн"
          value={s.overdue}
          note={s.overdue ? `${s.overdueClient} НБОГ-д · ${s.overdueVendor} гүйцэтгэгчид` : "зөрчилгүй"}
          dot={s.overdue ? "var(--crit)" : undefined}
        />
        <Kpi
          label="Сануулга хүлээж буй"
          value={s.warn}
          note={s.warn ? `${s.warnClient} НБОГ-д · ${s.warnVendor} гүйцэтгэгчид` : "мэдэгдэл алга"}
          dot={s.warn ? "var(--warn)" : undefined}
        />
        {isAll ? (
          <Kpi
            label="Эрсдэлтэй гүйцэтгэгч"
            value={`${s.riskyCompanies}/${s.companiesCount}`}
            note="хугацаа хэтэрсэн ажилтай"
            dot={s.riskyCompanies ? "var(--crit)" : undefined}
          />
        ) : (
          <Kpi label="Гэрээ дуусахад" value={s.daysToEnd} note={`хоног · ${s.period.split(" → ")[1]}`} />
        )}
        <Kpi label="Хугацаа баримталт" value={s.score} note="100 онооноос" />
      </section>

      {/* Явцын муруй ба хуанли */}
      <div className="dash-row grid min-h-0 gap-3 xl:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
        <ProgressCard months={months} scopes={scopes} selected={s} markerIndex={markerIndex} onSelect={setPick} />

        <section className="card min-h-0">
          <div className="flex min-h-0 flex-1 flex-col p-3.5">
            <Calendar reviewDate={reviewDate} deadlines={s.deadlines} notesByDay={s.notesByDay} />
          </div>
        </section>
      </div>

      {/* Анхаарал шаардсан · төлөвийн бүтэц · гүйцэтгэгчид */}
      <div className="dash-row grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="card min-h-0">
          <div className="card-head">
            <h2 className="card-title">Анхаарал шаардсан</h2>
            <span className="card-note">
              {s.queueTotal} ажил{isAll ? "" : ` · ${s.label}`}
            </span>
            <Link href={taskHref("status=attn")} className="card-note ml-auto hover:text-ink-2">
              бүгд →
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3">
            {s.queue.length === 0 && <p className="card-note">Хариу арга хэмжээ шаардсан ажил алга.</p>}
            <ul className="space-y-1">
              {s.queue.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/ajil?focus=${v.id}`}
                    className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-1.5 hover:border-line-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px]">{v.title}</span>
                      <span className="num mt-0.5 block truncate text-[10px] text-ink-3">
                        {v.companyName} · {v.deadline} ·{" "}
                        {v.daysLeft < 0 ? `${-v.daysLeft} хоног хэтэрсэн` : `${v.daysLeft} хоног үлдсэн`}
                        {v.escalatedTo && ` · ${v.escalatedTo}`}
                      </span>
                    </span>
                    <StatusPill status={v.status} />
                  </Link>
                </li>
              ))}
            </ul>
            {s.queueTotal > s.queue.length && (
              <Link href={taskHref("status=attn")} className="card-note mt-1.5 block hover:text-ink-2">
                + бусад {s.queueTotal - s.queue.length} ажил
              </Link>
            )}
          </div>
        </section>

        <section className="card min-h-0">
          <div className="card-head">
            <h2 className="card-title">Төлөвийн бүтэц</h2>
            <span className="card-note">{s.total} хяналтын цэг</span>
          </div>
          <div className="flex min-h-0 flex-1 items-center px-3.5 pb-3">
            <Donut segments={s.donut} centerValue={`${s.percent}%`} centerLabel="гүйцэтгэл" />
          </div>
        </section>

        <section className="card min-h-0">
          <div className="card-head">
            <h2 className="card-title">Гүйцэтгэгч байгууллага</h2>
            <span className="card-note truncate">{companies.length} компани · дарж шүүнэ</span>
            {!isAll && (
              <button className="chip ml-auto flex-none py-0.5" onClick={() => setPick("all")}>
                ✕ бүгд
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-[12px] [&_.cell]:px-2 [&_.table-head]:px-2">
              <thead>
                <tr>
                  <th className="table-head">Компани</th>
                  <th className="table-head">Гүйцэтгэл</th>
                  <th className="table-head text-right">Ирүүлсэн</th>
                  <th className="table-head text-right">Сануулга</th>
                  <th className="table-head text-right">Хэтэрсэн</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((row) => {
                  const on = row.id === pick;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setPick(on ? "all" : row.id)}
                      className={`cursor-pointer hover:bg-surface-2 ${on ? "bg-surface-2" : ""}`}
                    >
                      <td className="cell max-w-[168px] leading-tight">
                        <span className={`block truncate ${on ? "text-ink" : "text-ink-2"}`}>
                          <span className="num text-ink-3">{row.no}.</span> {row.name}
                          {row.demo && <span className="ml-1.5 text-[9.5px] text-ink-3">жишээ</span>}
                        </span>
                        <span className="block truncate text-[9.5px] text-ink-3">{row.scope}</span>
                      </td>
                      <td className="cell">
                        <div
                          className="flex items-center gap-2"
                          title={`Нийт ${row.total} үе шат · ирүүлсэн ${row.done} · хугацаа хэтэрсэн ${row.over}`}
                        >
                          <span className="flex h-1.5 w-[42px] overflow-hidden rounded-full bg-surface-3">
                            <i style={{ width: `${row.doneShare}%`, background: "var(--ok)" }} />
                            <i style={{ width: `${row.overShare}%`, background: "var(--crit)" }} />
                          </span>
                          <span className="num w-7 text-right text-[10.5px] text-ink-3">{row.percent}%</span>
                        </div>
                      </td>
                      <td className="cell num text-right text-ink-2">{row.done}</td>
                      <td className="cell num text-right" style={{ color: row.warn ? "var(--warn)" : "var(--ink-3)" }}>
                        {row.warn}
                      </td>
                      <td
                        className="cell num text-right"
                        style={{ color: row.over ? "var(--crit)" : "var(--ink-3)", fontWeight: row.over ? 600 : 400 }}
                      >
                        {row.over}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Өнгөний тайлбар */}
          <div className="flex flex-none flex-wrap gap-x-4 gap-y-1 border-t border-line px-3.5 py-1.5 text-[10px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-4 rounded-full" style={{ background: "var(--ok)" }} />
              ирүүлсэн
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-4 rounded-full" style={{ background: "var(--crit)" }} />
              хугацаа хэтэрсэн
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-4 rounded-full" style={{ background: "var(--surface-3)" }} />
              хүлээгдэж буй
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value, note, dot }: { label: string; value: string | number; note: string; dot?: string }) {
  return (
    <div className="card px-3.5 py-2">
      <div className="flex items-center gap-1.5">
        {dot && <i className="block size-1.5 rounded-full" style={{ background: dot }} />}
        <span className="text-[11px] text-ink-3">{label}</span>
      </div>
      <div className="stat mt-0.5 text-[23px]">{value}</div>
      <div className="num text-[10px] text-ink-3">{note}</div>
    </div>
  );
}
