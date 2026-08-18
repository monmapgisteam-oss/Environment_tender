"use client";

import { useEffect, useMemo, useTransition } from "react";
import { StatusPill } from "@/components/StatusPill";
import { buildViews } from "@/lib/escalation";
import { reviewDate } from "@/lib/seed";
import { markSubmitted, undoSubmit, useDB } from "@/lib/store";

const STEP_COLOR: Record<string, string> = {
  reminder: "var(--warn)",
  final: "var(--warn)",
  level2: "var(--crit)",
  level3: "var(--sev)",
};

const STEP_STATE: Record<string, string> = {
  sent: "илгээсэн",
  pending: "хүлээгдэж буй",
  skipped: "шаардлагагүй — тайлан ирсэн",
};

export function MilestoneDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const db = useDB();
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const detail = useMemo(() => {
    if (!id) return null;
    const asOf = reviewDate(db.settings);
    const view = buildViews(db, asOf).find((v) => v.id === id);
    if (!view) return null;
    const notifications = db.notifications
      .filter((n) => n.milestoneId === id && n.dueOn <= asOf)
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
    return { view, notifications };
  }, [db, id]);

  const open = Boolean(id);
  const view = detail?.view;

  const act = (fn: (id: string) => void) => {
    if (!id) return;
    start(() => fn(id));
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[rgba(10,16,14,0.42)] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-41 flex w-full max-w-[520px] flex-col overflow-auto border-l border-line bg-surface transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {view && (
          <>
            <header className="flex items-start gap-3 border-b border-line px-5 pt-5 pb-3.5">
              <div className="flex-1">
                <div className="eyebrow">
                  {view.companyNo}. {view.companyName} · {view.contractNo}
                </div>
                {/* Урт нэрийг тайлбараас нь салгаж, товч гарчиг + жижиг тайлбар болгоно */}
                <h2 className="mt-1 text-[13.5px] leading-snug font-semibold">{view.title.split(" — ")[0]}</h2>
                {view.title.includes(" — ") && (
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-2">
                    {view.title.split(" — ").slice(1).join(" — ")}
                  </p>
                )}
                <div className="mt-2">
                  <StatusPill status={view.status} />
                </div>
              </div>
              <button onClick={onClose} aria-label="Хаах" className="size-7 flex-none rounded-md bg-surface-3 text-ink-2">
                ✕
              </button>
            </header>

            <div className="border-b border-line px-5 py-4">
              <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
                {view.group && (
                  <>
                    <dt className="text-ink-3">Бүлэг</dt>
                    <dd className="m-0">{view.group}</dd>
                  </>
                )}
                <dt className="text-ink-3">Гүйцэтгэгч</dt>
                <dd className="m-0">{view.companyName}</dd>
                <dt className="text-ink-3">Хариуцах хэлтэс</dt>
                <dd className="m-0">{view.deptName}</dd>
                <dt className="text-ink-3">Хэлтсийн дарга</dt>
                <dd className="m-0">{view.deptHead}</dd>
                <dt className="text-ink-3">Үе шат</dt>
                <dd className="m-0">
                  {view.stageNo}. {view.stageName}
                </dd>
                <dt className="text-ink-3">Хугацаа</dt>
                <dd className="num m-0">
                  {view.stageStart} → {view.deadline}
                </dd>
                <dt className="text-ink-3">Төлөв</dt>
                <dd className="m-0">
                  {view.submittedAt
                    ? `Тайлан ирүүлсэн — ${view.submittedAt}`
                    : view.daysLeft < 0
                      ? `${-view.daysLeft} хоног хэтэрсэн`
                      : `${view.daysLeft} хоног үлдсэн`}
                </dd>
              </dl>
            </div>

            <div className="flex flex-col gap-2.5 border-b border-line px-5 py-4">
              <div className="eyebrow">Мэдэгдлийн шатлал</div>
              <div className="flex flex-col">
                {view.steps.map((step, i) => {
                  const color = STEP_COLOR[step.rule];
                  const sent = step.state === "sent";
                  return (
                    <div
                      key={step.rule}
                      className={`relative grid grid-cols-[22px_1fr] gap-2.5 ${
                        i === view.steps.length - 1 ? "" : "pb-3.5"
                      } ${step.state === "skipped" ? "opacity-50" : ""}`}
                    >
                      {i < view.steps.length - 1 && (
                        <span
                          className="absolute top-[17px] bottom-0 left-[6px] w-0.5"
                          style={{ background: sent ? color : "var(--line)" }}
                        />
                      )}
                      <span
                        className="z-1 mt-[3px] size-3.5 rounded-full border-2"
                        style={{
                          background: sent ? color : "var(--surface)",
                          borderColor: sent ? color : "var(--line-2)",
                        }}
                      />
                      <div>
                        <b className="block text-[12.5px]">{step.label}</b>
                        <small className="num text-[11.5px] text-ink-3">
                          {step.dueOn} · {STEP_STATE[step.state]}
                        </small>
                        <div className="mt-0.5 text-[11.5px] text-ink-3">
                          {step.recipients.map((r) => r.name).join(", ")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 px-5 py-4">
              {view.submittedAt ? (
                <button className="btn" disabled={pending} onClick={() => act(undoSubmit)}>
                  Ирүүлэлтийг цуцлах
                </button>
              ) : (
                <button className="btn btn-primary" disabled={pending} onClick={() => act(markSubmitted)}>
                  Тайлан ирүүлсэн гэж бүртгэх
                </button>
              )}
              <button className="btn" onClick={onClose}>
                Хаах
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
