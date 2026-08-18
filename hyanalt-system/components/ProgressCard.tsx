"use client";

import { useMemo, useState } from "react";
import { AreaChart, type Series } from "@/components/charts";
import type { Scope } from "@/components/DashboardView";

const RANGES = [
  { key: "6", label: "6 сар", months: 6 },
  { key: "12", label: "12 сар", months: 12 },
  { key: "all", label: "Бүх хугацаа", months: 0 },
];

export function ProgressCard({
  months,
  scopes,
  selected,
  markerIndex,
  onSelect,
}: {
  /** "2026-01" хэлбэрийн саруудын жагсаалт */
  months: string[];
  scopes: Scope[];
  selected: Scope;
  markerIndex: number;
  onSelect: (id: string) => void;
}) {
  const [range, setRange] = useState("all");
  const span = RANGES.find((r) => r.key === range)?.months ?? 0;
  const from = span ? Math.max(0, months.length - span) : 0;

  const series: Series[] = useMemo(
    () => [
      { id: "plan", name: "Төлөвлөгөө", color: "var(--ink-3)", dash: true, values: selected.monthlyPlanned.slice(from) },
      { id: "fact", name: "Гүйцэтгэл", color: "var(--accent)", fill: true, values: selected.monthlyActual.slice(from) },
    ],
    [selected, from],
  );

  const labels = months.slice(from).map((m) => m.slice(2));

  return (
    <section className="card">
      <div className="card-head flex-wrap">
        <h2 className="card-title">Гүйцэтгэлийн явц</h2>
        <span className="card-note">он, сараар · хуримтлагдсан тоогоор</span>
        <div className="seg ml-auto">
          {RANGES.map((r) => (
            <button key={r.key} data-on={range === r.key} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-3.5 pb-2 xl:grid-cols-[minmax(0,1fr)_196px]">
        <div className="flex min-h-0 flex-col">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-1.5">
            <b className="text-[12.5px]">{selected.label}</b>
            <span className="num text-[10.5px] text-ink-3">{selected.sub}</span>
            <span className="num text-[10.5px] text-ink-3">{selected.period}</span>
            <span className="ml-auto flex items-center gap-3 text-[10.5px]">
              <span className="text-ink-2">
                <span className="num">{selected.done}</span>/<span className="num">{selected.total}</span> ирүүлсэн
              </span>
              {selected.warn > 0 && (
                <span style={{ color: "var(--warn)" }}>
                  <span className="num">{selected.warn}</span> сануулга
                </span>
              )}
              {selected.overdue > 0 && (
                <span style={{ color: "var(--crit)" }}>
                  <span className="num">{selected.overdue}</span> хугацаа хэтэрсэн
                </span>
              )}
            </span>
          </div>

          <AreaChart
            labels={labels}
            series={series}
            max={Math.max(1, selected.total)}
            markerIndex={markerIndex - from >= 0 ? markerIndex - from : undefined}
          />

          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5 text-[10.5px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <i className="block h-px w-4" style={{ background: "var(--ink-3)" }} />
              <b className="font-normal text-ink-2">Төлөвлөгөө</b> — тухайн сар хүртэл ирсэн байх ёстой тайлан
            </span>
            <span className="flex items-center gap-1.5">
              <i className="block h-0.5 w-4 rounded" style={{ background: "var(--accent)" }} />
              <b className="font-normal text-ink-2">Гүйцэтгэл</b> — бодитоор хүлээн авсан тайлан
            </span>
            <span>Зурвас шугам = хяналтын огноо</span>
          </div>
        </div>

        {/* Гүйцэтгэгчийн жагсаалт — сонгоход самбар бүхэлдээ шүүгдэнэ */}
        <div className="flex min-h-0 flex-col rounded-lg border border-line bg-surface-2">
          <div className="eyebrow flex-none border-b border-line px-2.5 py-1.5">Гүйцэтгэгчээр шүүх</div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-1">
            {scopes.map((d) => {
              const on = d.id === selected.id;
              // Төлөвийг хувийн өнгөөр илэрхийлнэ — тусдаа тэмдэг хэрэггүй
              const tone = d.overdue > 0 ? "var(--crit)" : d.warn > 0 ? "var(--warn)" : "var(--ink-3)";
              return (
                <li key={d.id}>
                  <button
                    onClick={() => onSelect(d.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left ${
                      on ? "bg-surface-3 text-ink" : "text-ink-2 hover:bg-surface-3/60"
                    } ${d.id === "all" ? "border-b border-line" : ""}`}
                  >
                    <span className="min-w-0 flex-1 truncate text-[11px]">{d.label}</span>
                    <span className="num flex-none text-[10px]" style={{ color: tone }}>
                      {d.percent}%
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
