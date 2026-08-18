"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MilestoneDrawer } from "@/components/MilestoneDrawer";
import { IconAlert, IconSearch } from "@/components/icons";
import { STATUS_LABEL, STATUS_RANK } from "@/lib/escalation";
import type { Status } from "@/lib/types";

export interface Row {
  id: string;
  title: string;
  group?: string;
  companyId: string;
  companyNo: number;
  companyName: string;
  contractNo: string;
  deptId: string;
  deptName: string;
  deptHead: string;
  stageNo: number;
  stageName: string;
  deadline: string;
  status: Status;
  daysLeft: number;
  submittedAt: string | null;
  lastNoteDate: string | null;
  /** Хамгийн сүүлд хэн рүү мэдэгдэл явсан */
  notifiedTo: string | null;
}

const STRIPE: Record<Status, string> = {
  planned: "var(--surface-3)",
  active: "var(--data)",
  warn1: "var(--warn)",
  warn2: "var(--warn)",
  level2: "var(--crit)",
  level3: "var(--sev)",
  done: "var(--ok)",
  late: "var(--ok)",
};

/** Хурдан шүүлтүүр — хэрэглэгчийн хамгийн түгээмэл асуултууд */
const QUICK: { key: string; label: string; match: (r: Row) => boolean }[] = [
  { key: "", label: "Бүх ажил", match: () => true },
  { key: "overdue", label: "Хугацаа хэтэрсэн", match: (r) => r.status === "level2" || r.status === "level3" },
  { key: "attn", label: "Анхаарал шаардсан", match: (r) => ["level2", "level3", "warn1", "warn2"].includes(r.status) },
  { key: "warn", label: "Сануулгын бүсэд", match: (r) => r.status === "warn1" || r.status === "warn2" },
  { key: "running", label: "Хэрэгжиж буй", match: (r) => r.status === "active" },
  { key: "finished", label: "Ирүүлсэн", match: (r) => r.status === "done" || r.status === "late" },
];

const LIMIT = 300;

export function TaskExplorer({
  rows,
  companies,
  departments,
}: {
  rows: Row[];
  companies: { id: string; no: number; name: string }[];
  departments: { id: string; name: string }[];
}) {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [company, setCompany] = useState(params.get("company") ?? "");
  const [dept, setDept] = useState(params.get("dept") ?? "");
  const [quick, setQuick] = useState(params.get("status") ?? "");
  const [focus, setFocus] = useState<string | null>(params.get("focus") || null);

  const base = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (company && r.companyId !== company) return false;
      if (dept && r.deptId !== dept) return false;
      if (needle && !`${r.title} ${r.companyName}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, company, dept]);

  const filtered = useMemo(() => {
    const rule = QUICK.find((x) => x.key === quick) ?? QUICK[0];
    return base
      .filter(rule.match)
      .sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          a.deadline.localeCompare(b.deadline) ||
          a.companyNo - b.companyNo,
      );
  }, [base, quick]);

  const overdueCount = base.filter((r) => r.status === "level2" || r.status === "level3").length;

  const exportCsv = () => {
    const head = ["Гүйцэтгэгч", "Гэрээ", "Ажил", "Хариуцах хэлтэс", "Үе шат", "Эцсийн хугацаа", "Төлөв", "Ирүүлсэн", "Сүүлийн мэдэгдэл"];
    const body = filtered.map((r) =>
      [r.companyName, r.contractNo, r.title, r.deptName, `${r.stageNo}. ${r.stageName}`, r.deadline,
        STATUS_LABEL[r.status], r.submittedAt ?? "", r.lastNoteDate ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guitsetgeliin-tailan.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Хугацаа хэтэрсэн ажлын анхааруулга */}
      {overdueCount > 0 && quick !== "overdue" && (
        <button
          onClick={() => setQuick("overdue")}
          className="flex flex-none items-center gap-2.5 rounded-xl border px-3.5 py-2 text-left"
          style={{ borderColor: "var(--crit)", background: "var(--crit-soft)" }}
        >
          <IconAlert className="size-4 flex-none text-crit" />
          <b className="text-[12.5px] text-crit">{overdueCount} ажлын хугацаа хэтэрсэн</b>
          <span className="text-[12px] text-ink-2">шатлан мэдээллэх дүрэм ажилласан</span>
          <span className="ml-auto text-[12px] text-crit">Зөвхөн эдгээрийг харах →</span>
        </button>
      )}

      <div className="card min-h-0 flex-1">
        {/* Хайлт ба шүүлтүүр */}
        <div className="flex flex-none flex-wrap items-center gap-2 border-b border-line px-3.5 py-2.5">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
            <input
              className="field w-[210px] pl-8"
              placeholder="Ажил, компаниар хайх…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="field w-[190px]" value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">Бүх гүйцэтгэгч ({companies.length})</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.no}. {c.name}
              </option>
            ))}
          </select>
          <select className="field w-[190px]" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">Хариуцах бүх хэлтэс</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {(q || company || dept || quick) && (
            <button
              className="chip"
              onClick={() => {
                setQ("");
                setCompany("");
                setDept("");
                setQuick("");
              }}
            >
              Шүүлтүүр цэвэрлэх
            </button>
          )}
          <button className="chip ml-auto" onClick={exportCsv}>
            CSV татах
          </button>
        </div>

        {/* Хурдан шүүлтүүр — тоогоор нь */}
        <div className="flex flex-none flex-wrap items-center gap-1.5 border-b border-line px-3.5 py-2">
          {QUICK.map((f) => {
            const n = base.filter(f.match).length;
            const on = quick === f.key;
            return (
              <button key={f.key} className={`chip ${on ? "chip-on" : ""}`} onClick={() => setQuick(f.key)}>
                {f.label}
                <span className={`num ml-1.5 ${on ? "" : "text-ink-3"}`}>{n}</span>
              </button>
            );
          })}
          <span className="ml-auto text-[11px] text-ink-3">Мөр дээр дарж мэдэгдлийн явцыг харна</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="table-head">Ажил</th>
                <th className="table-head">Гүйцэтгэгч компани</th>
                <th className="table-head">Үе шат</th>
                <th className="table-head">Эцсийн хугацаа</th>
                <th className="table-head">Төлөв</th>
                <th className="table-head">Хэн рүү мэдэгдсэн</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, LIMIT).map((r) => {
                const late = r.status === "level2" || r.status === "level3";
                return (
                  <tr
                    key={r.id}
                    onClick={() => setFocus(r.id)}
                    className="cursor-pointer hover:bg-surface-2"
                    style={late ? { background: "color-mix(in srgb, var(--crit-soft) 60%, transparent)" } : undefined}
                  >
                    <td className="cell max-w-[380px]">
                      <div className="flex gap-2.5">
                        <span className="w-0.5 flex-none rounded-full" style={{ background: STRIPE[r.status] }} />
                        <div className="min-w-0">
                          <div className="truncate">{r.title}</div>
                          <div className="truncate text-[10.5px] text-ink-3">
                            {r.group ? `${r.group} · ` : ""}Хариуцах: {r.deptName} · {r.deptHead}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="cell max-w-[190px]">
                      <div className="truncate text-ink-2">
                        <span className="num text-ink-3">{r.companyNo}.</span> {r.companyName}
                      </div>
                      <div className="num truncate text-[10px] text-ink-3">{r.contractNo}</div>
                    </td>
                    <td className="cell max-w-[150px]">
                      <div className="truncate text-ink-2">
                        {r.stageNo}. {r.stageName}
                      </div>
                    </td>
                    <td className="cell whitespace-nowrap">
                      <div className="num text-ink-2">{r.deadline}</div>
                      <div className="num text-[10px]" style={{ color: late ? "var(--crit)" : "var(--ink-3)" }}>
                        {r.submittedAt
                          ? `ирүүлсэн ${r.submittedAt}`
                          : r.daysLeft < 0
                            ? `${-r.daysLeft} хоног хэтэрсэн`
                            : `${r.daysLeft} хоног үлдсэн`}
                      </div>
                    </td>
                    <td className="cell">
                      <span className={`pill pill-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    </td>
                    <td className="cell max-w-[210px]">
                      <div className="truncate text-[11.5px] text-ink-2">{r.notifiedTo ?? "—"}</div>
                      {r.lastNoteDate && <div className="num text-[10px] text-ink-3">{r.lastNoteDate}</div>}
                    </td>
                  </tr>
                );
              })}
              {filtered.length > LIMIT && (
                <tr>
                  <td className="cell text-ink-3" colSpan={6}>
                    … нийт {filtered.length} бичлэгээс эхний {LIMIT}-г харуулав. Компани эсвэл хэлтсээр шүүнэ үү.
                  </td>
                </tr>
              )}
              {filtered.length === 0 && (
                <tr>
                  <td className="cell text-center text-ink-3" colSpan={6}>
                    Энэ нөхцөлд тохирох ажил алга.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-none items-center gap-3 border-t border-line px-3.5 py-2 text-[11px] text-ink-3">
          <span>
            Харуулсан: <span className="num text-ink-2">{Math.min(filtered.length, LIMIT)}</span> / {filtered.length}
          </span>
          <span className="ml-auto flex flex-wrap gap-3">
            {(["level3", "level2", "warn2", "active", "done"] as Status[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <i className="size-2 rounded-[3px]" style={{ background: STRIPE[s] }} />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </span>
        </div>
      </div>

      <MilestoneDrawer id={focus} onClose={() => setFocus(null)} />
    </>
  );
}
