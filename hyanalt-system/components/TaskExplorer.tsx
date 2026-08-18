"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MilestoneDrawer } from "@/components/MilestoneDrawer";
import { IconAlert, IconChevronRight, IconSearch } from "@/components/icons";
import { StateSelect } from "@/components/StateSelect";
import { STATUS_LABEL, STATUS_RANK } from "@/lib/escalation";
import type { Status } from "@/lib/types";

export interface Row {
  id: string;
  title: string;
  group?: string;
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
  nbogState?: string;
  vendorState?: string;
  /** Хамгийн сүүлд хэн рүү мэдэгдэл явсан */
  notifiedTo: string | null;
}

export interface StageInfo {
  no: number;
  name: string;
  start: string;
  end: string;
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

/** Хурдан шүүлтүүр — хамгийн түгээмэл асуултууд */
const QUICK: { key: string; label: string; match: (r: Row) => boolean }[] = [
  { key: "", label: "Бүх ажил", match: () => true },
  { key: "overdue", label: "Хугацаа хэтэрсэн", match: (r) => r.status === "level2" || r.status === "level3" },
  { key: "attn", label: "Анхаарал шаардсан", match: (r) => ["level2", "level3", "warn1", "warn2"].includes(r.status) },
  { key: "warn", label: "Сануулгын бүсэд", match: (r) => r.status === "warn1" || r.status === "warn2" },
  { key: "running", label: "Хэрэгжиж буй", match: (r) => r.status === "active" },
  { key: "finished", label: "Ирүүлсэн", match: (r) => r.status === "done" || r.status === "late" },
];

/** CSV-д бичих гар удирдлагатай төлөвийн нэрс */
const NBOG_LABEL: Record<string, string> = {
  wait_vendor: "Монмэп-с хүлээгдэж буй",
  wait_client: "НБОГ-с хүлээгдэж буй",
  in_progress: "Хийгдэж байгаа",
  done: "Дууссан",
};
const VENDOR_LABEL: Record<string, string> = { yes: "Тийм", in_progress: "Хийгдэж байгаа" };

interface Counts {
  total: number;
  done: number;
  warn: number;
  over: number;
}

function count(rows: Row[]): Counts {
  return {
    total: rows.length,
    done: rows.filter((r) => r.status === "done" || r.status === "late").length,
    warn: rows.filter((r) => r.status === "warn1" || r.status === "warn2").length,
    over: rows.filter((r) => r.status === "level2" || r.status === "level3").length,
  };
}

export function TaskExplorer({
  rows,
  stages,
  companyName,
  contractNo,
}: {
  rows: Row[];
  stages: StageInfo[];
  companyName: string;
  contractNo: string;
}) {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [quick, setQuick] = useState(params.get("status") ?? "");
  const [focus, setFocus] = useState<string | null>(params.get("focus") || null);
  // Анх зөвхөн эхний үе шат задарсан байна — доош гүйлгэх зүйл бага байх
  const [openStages, setOpenStages] = useState<Set<number>>(new Set([stages[0]?.no ?? 1]));
  const [openDepts, setOpenDepts] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rule = QUICK.find((x) => x.key === quick) ?? QUICK[0];
    return rows.filter((r) => {
      if (!rule.match(r)) return false;
      if (needle && !`${r.title} ${r.group ?? ""} ${r.deptName}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, quick]);

  /** Үе шат → хэлтэс → ажил */
  const tree = useMemo(() => {
    return stages
      .map((stage) => {
        const stageRows = filtered.filter((r) => r.stageNo === stage.no);
        const depts = [...new Map(stageRows.map((r) => [r.deptId, r])).values()]
          .map((first) => {
            const deptRows = stageRows
              .filter((r) => r.deptId === first.deptId)
              .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.title.localeCompare(b.title));
            return { id: first.deptId, name: first.deptName, head: first.deptHead, rows: deptRows, counts: count(deptRows) };
          })
          .sort((a, b) => b.counts.over - a.counts.over || a.name.localeCompare(b.name));
        return { stage, depts, counts: count(stageRows) };
      })
      .filter((s) => s.counts.total > 0);
  }, [filtered, stages]);

  // Хайлт/шүүлтүүр идэвхтэй үед олдсон бүлгүүд өөрөө задарна
  const searching = Boolean(q.trim()) || Boolean(quick);
  const stageOpen = (no: number) => searching || openStages.has(no);
  const deptOpen = (key: string) => searching || openDepts.has(key);

  const toggle = <T,>(set: Set<T>, value: T, apply: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  };

  const overdueCount = rows.filter((r) => r.status === "level2" || r.status === "level3").length;

  const exportCsv = () => {
    const head = ["Үе шат", "Хариуцах хэлтэс", "Бүлэг", "Ажил", "НБОГ", "Монмэп", "Эцсийн хугацаа", "Системийн төлөв", "Ирүүлсэн"];
    const body = filtered.map((r) =>
      [`${r.stageNo}. ${r.stageName}`, r.deptName, r.group ?? "", r.title,
        NBOG_LABEL[r.nbogState ?? ""] ?? "", VENDOR_LABEL[r.vendorState ?? ""] ?? "",
        r.deadline, STATUS_LABEL[r.status], r.submittedAt ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "monmap-guitsetgel.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {overdueCount > 0 && quick !== "overdue" && (
        <button
          onClick={() => setQuick("overdue")}
          className="flex flex-none items-center gap-2.5 rounded-xl border px-3.5 py-2 text-left"
          style={{ borderColor: "var(--crit)", background: "var(--crit-soft)" }}
        >
          <IconAlert className="size-4 flex-none text-crit" />
          <b className="text-[12.5px] text-crit">{overdueCount} ажлын хугацаа хэтэрсэн</b>
          <span className="ml-auto text-[12px] text-crit">Зөвхөн эдгээрийг харах →</span>
        </button>
      )}

      <div className="card min-h-0 flex-1">
        <div className="flex flex-none flex-wrap items-center gap-2 border-b border-line px-3.5 py-2.5">
          <div>
            <b className="text-[12.5px]">{companyName}</b>
            <span className="num ml-2 text-[10.5px] text-ink-3">{contractNo}</span>
          </div>
          <div className="relative ml-auto">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
            <input
              className="field w-[220px] pl-8"
              placeholder="Ажлын нэрээр хайх…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className="chip" onClick={() => { setOpenStages(new Set(stages.map((s) => s.no))); setOpenDepts(new Set()); }}>
            Бүгдийг нээх
          </button>
          <button className="chip" onClick={() => { setOpenStages(new Set()); setOpenDepts(new Set()); }}>
            Бүгдийг хаах
          </button>
          <button className="chip" onClick={exportCsv}>
            CSV татах
          </button>
        </div>

        <div className="flex flex-none flex-wrap items-center gap-1.5 border-b border-line px-3.5 py-2">
          {QUICK.map((f) => {
            const n = rows.filter(f.match).length;
            const on = quick === f.key;
            return (
              <button key={f.key} className={`chip ${on ? "chip-on" : ""}`} onClick={() => setQuick(f.key)}>
                {f.label}
                <span className={`num ml-1.5 ${on ? "" : "text-ink-3"}`}>{n}</span>
              </button>
            );
          })}
          <span className="ml-auto text-[11px] text-ink-3">Үе шат → хэлтэс → ажил дарааллаар задарна</span>
        </div>

        {/* Баганын нэр */}
        <div className="eyebrow grid flex-none grid-cols-[1fr_130px_104px_82px_142px] items-center gap-2.5 border-b border-line py-1.5 pr-3 pl-12">
          <span>Ажил</span>
          <span>НБОГ</span>
          <span>Монмэп</span>
          <span className="text-right">Хугацаа</span>
          <span>Системийн төлөв</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tree.length === 0 && <p className="card-note px-3.5 py-3">Энэ нөхцөлд тохирох ажил алга.</p>}

          {tree.map(({ stage, depts, counts }) => (
            <div key={stage.no}>
              {/* Үе шат */}
              <button
                onClick={() => toggle(openStages, stage.no, setOpenStages)}
                className="flex w-full items-center gap-2.5 border-b border-line bg-surface-2 px-3.5 py-2 text-left hover:bg-surface-3"
              >
                <IconChevronRight
                  className={`size-3.5 flex-none text-ink-3 transition-transform ${stageOpen(stage.no) ? "rotate-90" : ""}`}
                />
                <span className="num text-[11px] text-ink-3">{stage.no}</span>
                <b className="text-[12.5px]">{stage.name}</b>
                <span className="num text-[10.5px] text-ink-3">
                  {stage.start} → {stage.end}
                </span>
                <Summary counts={counts} className="ml-auto" />
              </button>

              {stageOpen(stage.no) &&
                depts.map((dept) => {
                  const key = `${stage.no}|${dept.id}`;
                  return (
                    <div key={key}>
                      {/* Хэлтэс */}
                      <button
                        onClick={() => toggle(openDepts, key, setOpenDepts)}
                        className="flex w-full items-center gap-2.5 border-b border-line px-3.5 py-1.5 pl-8 text-left hover:bg-surface-2"
                      >
                        <IconChevronRight
                          className={`size-3 flex-none text-ink-3 transition-transform ${deptOpen(key) ? "rotate-90" : ""}`}
                        />
                        <span className="truncate text-[12px] text-ink-2">{dept.name}</span>
                        <span className="num text-[10.5px] text-ink-3">{dept.head}</span>
                        <Summary counts={dept.counts} className="ml-auto" />
                      </button>

                      {deptOpen(key) &&
                        dept.rows.map((r) => {
                          const late = r.status === "level2" || r.status === "level3";
                          return (
                            <button
                              key={r.id}
                              onClick={() => setFocus(r.id)}
                              className="grid w-full grid-cols-[1fr_130px_104px_82px_142px] items-center gap-2.5 border-b border-line py-1.5 pr-3 pl-12 text-left hover:bg-surface-2"
                              style={late ? { background: "color-mix(in srgb, var(--crit-soft) 55%, transparent)" } : undefined}
                            >
                              <span className="flex min-w-0 gap-2.5">
                                <i className="w-0.5 flex-none rounded-full" style={{ background: STRIPE[r.status] }} />
                                <span className="min-w-0">
                                  <span className="block truncate text-[12px]">{r.title}</span>
                                  {r.group && <span className="block truncate text-[10px] text-ink-3">{r.group}</span>}
                                </span>
                              </span>
                              <StateSelect side="nbog" milestoneId={r.id} value={r.nbogState} width={130} />
                              <StateSelect side="vendor" milestoneId={r.id} value={r.vendorState} width={104} />
                              <span className="num text-right text-[11px] whitespace-nowrap text-ink-2">
                                {r.deadline}
                                <span className="block text-[10px]" style={{ color: late ? "var(--crit)" : "var(--ink-3)" }}>
                                  {r.submittedAt
                                    ? `ирүүлсэн ${r.submittedAt}`
                                    : r.daysLeft < 0
                                      ? `${-r.daysLeft} хоног хэтэрсэн`
                                      : `${r.daysLeft} хоног үлдсэн`}
                                </span>
                              </span>
                              <span className={`pill pill-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                            </button>
                          );
                        })}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>

        <div className="flex flex-none items-center gap-3 border-t border-line px-3.5 py-2 text-[11px] text-ink-3">
          <span>
            Харуулсан: <span className="num text-ink-2">{filtered.length}</span> / {rows.length} хяналтын цэг
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

/** Бүлгийн товч тоо — ирүүлсэн / сануулга / хэтэрсэн */
function Summary({ counts, className = "" }: { counts: Counts; className?: string }) {
  return (
    <span className={`flex flex-none items-center gap-2.5 text-[10.5px] ${className}`}>
      <span className="num text-ink-3">{counts.total} ажил</span>
      <span className="num" style={{ color: "var(--ok)" }}>
        {counts.done} ирүүлсэн
      </span>
      {counts.warn > 0 && (
        <span className="num" style={{ color: "var(--warn)" }}>
          {counts.warn} сануулга
        </span>
      )}
      {counts.over > 0 && (
        <span className="num" style={{ color: "var(--crit)" }}>
          {counts.over} хэтэрсэн
        </span>
      )}
      <span className="flex h-1.5 w-[46px] overflow-hidden rounded-full bg-surface-3">
        <i style={{ width: `${(counts.done / counts.total) * 100}%`, background: "var(--ok)" }} />
        <i style={{ width: `${(counts.over / counts.total) * 100}%`, background: "var(--crit)" }} />
      </span>
    </span>
  );
}
