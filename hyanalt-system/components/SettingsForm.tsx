"use client";

import { useTransition } from "react";
import { updateSettings } from "@/lib/store";
import type { RuleKey, Settings } from "@/lib/types";

const RULE_UI: {
  key: RuleKey;
  field: keyof Settings;
  label: string;
  audience: string;
  color: string;
  after: boolean;
}[] = [
  { key: "reminder", field: "reminderLead", label: "Урьдчилсан сануулга", audience: "Гүйцэтгэгчийн мэргэжилтэн", color: "var(--warn)", after: false },
  { key: "final", field: "finalLead", label: "Эцсийн сануулга", audience: "Гүйцэтгэгчийн төслийн хариуцагч", color: "var(--warn)", after: false },
  { key: "level2", field: "deptHeadAfter", label: "Хэлтсийн даргад мэдэгдэх", audience: "Хэлтсийн дарга (гүйцэтгэгчид хуулбар)", color: "var(--crit)", after: true },
  { key: "level3", field: "directorAfter", label: "Газрын даргад мэдэгдэх", audience: "Зөвхөн газрын дарга", color: "var(--sev)", after: true },
];

export function SettingsForm({ settings }: { settings: Settings }) {
  const [pending, start] = useTransition();
  const patch = (p: Partial<Settings>) => start(() => updateSettings(p));

  return (
    <>
      <section className="card flex-none">
        <div className="card-head">
          <h2 className="card-title">Мэдэгдлийн шатлал</h2>
          <span className="card-note">хугацааг үе шатны эцсийн хугацаанаас тоолно</span>
        </div>
        <div className="flex flex-col gap-1.5 px-3.5 pb-3.5">
          {RULE_UI.map((r) => (
            <div
              key={r.key}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5"
            >
              <i className="block size-1.5 flex-none rounded-full" style={{ background: r.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px]">{r.label}</div>
                <div className="truncate text-[10.5px] text-ink-3">{r.audience}</div>
              </div>
              <label className="flex items-center gap-2 text-[11px] whitespace-nowrap text-ink-3">
                <span>{r.after ? "хэтэрснээс хойш" : "дуусахаас өмнө"}</span>
                <input
                  type="number"
                  min={0}
                  max={90}
                  disabled={pending}
                  className="field w-14 text-center"
                  defaultValue={settings[r.field] as number}
                  onBlur={(e) => {
                    const v = Math.max(0, Math.min(90, Number(e.target.value) || 0));
                    if (v !== settings[r.field]) patch({ [r.field]: v } as Partial<Settings>);
                  }}
                />
                <span>хоног</span>
              </label>
            </div>
          ))}
        </div>
      </section>

    </>
  );
}

