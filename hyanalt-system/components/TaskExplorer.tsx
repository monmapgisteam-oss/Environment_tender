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
  waiting: "НБОГ-оос хүлээгдэж буй",
  working: "Хийгдэж байгаа",
  done: "Дууссан",
};
const VENDOR_LABEL: Record<string, string> = { working: "Хийгдэж байгаа", done: "Дууссан, системд орсон" };

interface Counts {
  total: number;
  /** НБОГ талаас "Дууссан" гэж тэмдэглэсэн ажил */
  nbogDone: number;
  /** Монмэп талаас "Дууссан, системд орсон" гэж тэмдэглэсэн ажил */
  vendorDone: number;
}

function count(rows: Row[]): Counts {
  return {
    total: rows.length,
    nbogDone: rows.filter((r) => r.nbogState === "done").length,
    vendorDone: rows.filter((r) => r.vendorState === "done").length,
  };
}

export function TaskExplorer({
  rows,
  stages,
  companyName,
}: {
  rows: Row[];
  stages: StageInfo[];
  companyName: string;
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
          // Хугацаа хэтэрсэн ажил ихтэй хэлтэс эхэнд
          .sort(
            (a, b) =>
              b.rows.filter((r) => r.status === "level2" || r.status === "level3").length -
                a.rows.filter((r) => r.status === "level2" || r.status === "level3").length ||
              a.name.localeCompare(b.name),
          );
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
    const head = ["Үе шат", "Хариуцах хэлтэс", "Бүлэг", "Ажил", "НБОГ", "Монмэп", "Эцсийн хугацаа", "Системийн төлөв"];
    const body = filtered.map((r) =>
      [`${r.stageNo}. ${r.stageName}`, r.deptName, r.group ?? "", r.title,
        NBOG_LABEL[r.nbogState ?? ""] ?? "", VENDOR_LABEL[r.vendorState ?? ""] ?? "",
        r.deadline, STATUS_LABEL[r.status]]
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
          <b className="text-[12.5px]">{companyName}</b>
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
        </div>

        {/* Баганын нэр — доорх бүх мөр яг энэ баганад эгнэнэ */}
        <div className="eyebrow grid flex-none grid-cols-[1fr_122px_98px_88px] items-center gap-10 border-b border-line py-2 pr-24 pl-4">
          <span>Ажил</span>
          <span className="text-center">НБОГ</span>
          <span className="text-center">Монмэп</span>
          <span className="text-right">Хугацаа</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tree.length === 0 && <p className="card-note px-4 py-3">Энэ нөхцөлд тохирох ажил алга.</p>}

          {tree.map(({ stage, depts, counts }) => (
            <div key={stage.no}>
              {/* Үе шат */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggle(openStages, stage.no, setOpenStages)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(openStages, stage.no, setOpenStages)}
                className="grid w-full cursor-pointer grid-cols-[1fr_122px_98px_88px] items-center gap-10 border-b border-line bg-surface-2 py-2.5 pr-20 pl-4 hover:bg-surface-3"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <IconChevronRight
                    className={`size-3.5 flex-none text-ink-3 transition-transform ${stageOpen(stage.no) ? "rotate-90" : ""}`}
                  />
                  <span className="num text-[11px] text-ink-3">{stage.no}</span>
                  <b className="truncate text-[12.5px]">{stage.name}</b>
                  <span className="num flex-none text-[10.5px] text-ink-3">
                    {stage.start} → {stage.end}
                  </span>
                  <span className="num flex-none text-[10.5px] text-ink-3">· {counts.total} ажил</span>
                </span>
                <Meter value={pct(counts.nbogDone, counts.total)} color="var(--ok)" />
                <Meter value={pct(counts.vendorDone, counts.total)} color="var(--plum)" />
                <span />
              </div>

              {stageOpen(stage.no) &&
                depts.map((dept) => {
                  const key = `${stage.no}|${dept.id}`;
                  return (
                    <div key={key}>
                      {/* Хэлтэс */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggle(openDepts, key, setOpenDepts)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(openDepts, key, setOpenDepts)}
                        className="grid w-full cursor-pointer grid-cols-[1fr_122px_98px_88px] items-center gap-10 border-b border-line py-2 pr-20 pl-8 hover:bg-surface-2"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <IconChevronRight
                            className={`size-3 flex-none text-ink-3 transition-transform ${deptOpen(key) ? "rotate-90" : ""}`}
                          />
                          <span className="truncate text-[12px] text-ink-2">{dept.name}</span>
                          <span className="num flex-none text-[10.5px] text-ink-3">{dept.head}</span>
                          <span className="num flex-none text-[10.5px] text-ink-3">· {dept.counts.total} ажил</span>
                        </span>
                        <Meter value={pct(dept.counts.nbogDone, dept.counts.total)} color="var(--ok)" />
                        <Meter value={pct(dept.counts.vendorDone, dept.counts.total)} color="var(--plum)" />
                        <span />
                      </div>

                      {deptOpen(key) &&
                        dept.rows.map((r) => {
                          const late = r.status === "level2" || r.status === "level3";
                          return (
                            <div
                              key={r.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setFocus(r.id)}
                              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFocus(r.id)}
                              className="grid w-full cursor-pointer grid-cols-[1fr_122px_98px_88px] items-center gap-10 border-b border-line py-2 pr-20 pl-12 text-left hover:bg-surface-2"
                              style={late ? { background: "color-mix(in srgb, var(--crit-soft) 55%, transparent)" } : undefined}
                            >
                              <span className="flex min-w-0 gap-2.5">
                                <i className="w-0.5 flex-none rounded-full" style={{ background: STRIPE[r.status] }} />
                                <span className="min-w-0">
                                  <span className="block truncate text-[12px]">{r.title}</span>
                                  {r.group && <span className="block truncate text-[10px] text-ink-3">{r.group}</span>}
                                </span>
                              </span>
                              <span className="flex">
                                <StateSelect side="nbog" milestoneId={r.id} value={r.nbogState} width={122} />
                              </span>
                              <span className="flex">
                                <StateSelect side="vendor" milestoneId={r.id} value={r.vendorState} width={98} />
                              </span>
                              <span className="num text-right text-[11px] whitespace-nowrap text-ink-2">
                                {r.deadline}
                                <span className="block text-[10px]" style={{ color: late ? "var(--crit)" : "var(--ink-3)" }}>
                                  {r.daysLeft < 0 ? `${-r.daysLeft} хоног хэтэрсэн` : `${r.daysLeft} хоног үлдсэн`}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>

      </div>

      <MilestoneDrawer id={focus} onClose={() => setFocus(null)} />
    </>
  );
}

/** Хувь тооцох туслах */
function pct(n: number, total: number) {
  return total ? Math.round((n / total) * 100) : 0;
}

/** Гүйцэтгэлийн хувь — баганадаа эгнэсэн жижиг хэмжүүр */
function Meter({ value, color }: { value: number; color: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="num w-7 text-right text-[10.5px]" style={{ color: value > 0 ? color : "var(--ink-3)" }}>
        {value}%
      </span>
      <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
        <i style={{ width: `${value}%`, background: color }} />
      </span>
    </span>
  );
}
