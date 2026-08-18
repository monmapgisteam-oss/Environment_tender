"use client";

import { useMemo, useState } from "react";
import { MilestoneDrawer } from "@/components/MilestoneDrawer";
import { IconSearch } from "@/components/icons";
import { formatLong } from "@/lib/date";
import type { RuleKey } from "@/lib/types";

export interface FeedItem {
  id: string;
  milestoneId: string;
  companyId: string;
  companyName: string;
  companyNo: number;
  rule: RuleKey;
  dueOn: string;
  taskTitle: string;
  stageNo: number;
  deadline: string;
  /** Хугацаа хэтэрсэн хоног (мэдэгдэл илгээгдсэн өдрөөр) */
  overdueDays: number;
  recipients: string[];
  escalatedTo: string[];
}

const RULE_UI: Record<RuleKey, { label: string; color: string; hint: string }> = {
  reminder: { label: "1. Урьдчилсан сануулга", color: "var(--warn)", hint: "Гүйцэтгэгчийн мэргэжилтэнд сануулав" },
  final: { label: "2. Эцсийн сануулга", color: "var(--warn)", hint: "Төслийн хариуцагчид давтан сануулав" },
  level2: { label: "3. Хэлтсийн даргад", color: "var(--crit)", hint: "Хугацаа хэтэрсэн тул хэлтсийн даргад мэдэгдэв" },
  level3: { label: "4. Газрын даргад", color: "var(--sev)", hint: "Ноцтой хоцролт — газрын даргад мэдэгдэв" },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Бүх мэдэгдэл" },
  { key: "reminder", label: "1. Урьдчилсан сануулга" },
  { key: "final", label: "2. Эцсийн сануулга" },
  { key: "level2", label: "3. Хэлтсийн даргад" },
  { key: "level3", label: "4. Газрын даргад" },
];

export function NoteFeed({
  items,
  total,
  companies,
}: {
  items: FeedItem[];
  total: number;
  companies: { id: string; no: number; name: string }[];
}) {
  const [rule, setRule] = useState("");
  const [company, setCompany] = useState("");
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState<string | null>(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (rule && i.rule !== rule) return false;
      if (company && i.companyId !== company) return false;
      if (needle && !`${i.taskTitle} ${i.companyName} ${i.recipients.join(" ")}`.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [items, rule, company, q]);

  const grouped = useMemo(
    () => list.map((n, i) => ({ note: n, separator: i === 0 || list[i - 1].dueOn !== n.dueOn ? n.dueOn : null })),
    [list],
  );

  return (
    <>
      <div className="card min-h-0 flex-1">
        <div className="flex flex-none flex-wrap items-center gap-2 border-b border-line px-3.5 py-2.5">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
            <input
              className="field w-[210px] pl-8"
              placeholder="Ажил, компани, хүнээр хайх…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="field w-[190px]" value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">Бүх гүйцэтгэгч</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.no}. {c.name}
              </option>
            ))}
          </select>
          <span className="text-[11.5px] text-ink-3">
            Харуулсан <span className="num text-ink-2">{list.length}</span> / {total} мэдэгдэл
          </span>
        </div>

        <div className="flex flex-none flex-wrap items-center gap-1.5 border-b border-line px-3.5 py-2">
          {FILTERS.map((f) => {
            const n = f.key ? items.filter((i) => i.rule === f.key).length : items.length;
            const on = rule === f.key;
            return (
              <button key={f.key} className={`chip ${on ? "chip-on" : ""}`} onClick={() => setRule(f.key)}>
                {f.label}
                <span className={`num ml-1.5 ${on ? "" : "text-ink-3"}`}>{n}</span>
              </button>
            );
          })}
          <span className="ml-auto text-[11px] text-ink-3">Мөр дээр дарж албан бичгийн эхийг харна</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.length === 0 && <p className="card-note px-3.5 py-3">Энэ нөхцөлд тохирох мэдэгдэл алга.</p>}
          {grouped.map(({ note: n, separator: sep }) => {
            const ui = RULE_UI[n.rule];
            return (
              <div key={n.id}>
                {sep && (
                  <div className="eyebrow sticky top-0 z-1 border-y border-line bg-surface px-3.5 py-1.5">
                    {formatLong(sep)}
                  </div>
                )}
                <button
                  onClick={() => setFocus(n.milestoneId)}
                  className="grid w-full grid-cols-[150px_1fr_auto] items-start gap-3 border-b border-line px-3.5 py-2 text-left hover:bg-surface-2"
                >
                  <span className="flex flex-col gap-1">
                    <span
                      className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium"
                      style={{ background: "var(--surface-3)", color: ui.color }}
                    >
                      <i className="size-1.5 rounded-full" style={{ background: ui.color }} />
                      {ui.label}
                    </span>
                    <span className="num text-[10px] text-ink-3">{n.dueOn}</span>
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px]">{n.taskTitle}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-3">
                      <span className="num">{n.companyNo}.</span> {n.companyName} · {n.stageNo}-р үе шат ·{" "}
                      эцсийн хугацаа <span className="num">{n.deadline}</span>
                      {n.overdueDays > 0 && (
                        <span className="text-crit"> · {n.overdueDays} хоног хэтэрсэн</span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-ink-2">
                      <span className="text-ink-3">Хүлээн авагч:</span> {n.recipients.join(", ")}
                    </span>
                  </span>

                  <span className="max-w-[230px] text-right text-[10.5px] text-ink-3">
                    {ui.hint}
                    {n.escalatedTo.length > 0 && (
                      <span className="mt-1 block" style={{ color: ui.color }}>
                        шатлал ахисан: {n.escalatedTo.join(", ")}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <MilestoneDrawer id={focus} onClose={() => setFocus(null)} />
    </>
  );
}
