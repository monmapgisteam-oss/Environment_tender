"use client";

import { useEffect, useState, useTransition } from "react";
import { StatusPill } from "@/components/StatusPill";
import { getMilestoneDetailAction, markSubmittedAction, undoSubmitAction } from "@/lib/actions";
import type { MilestoneView, Notification } from "@/lib/types";

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
  const [data, setData] = useState<{ view: MilestoneView; notifications: Notification[] } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getMilestoneDetailAction(id).then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = Boolean(id);
  // Хаагдах хөдөлгөөний үед агуулга нь алга болохгүйн тулд хуучин өгөгдлийг үлдээнэ
  const detail = id ? (data?.view.id === id ? data : null) : data;
  const view = detail?.view;
  const lastLetter = detail?.notifications.at(-1);

  const act = (fn: (id: string) => Promise<void>) => {
    if (!id) return;
    start(async () => {
      await fn(id);
      setData(await getMilestoneDetailAction(id));
    });
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
                <h2 className="mt-1 text-[17px] leading-snug font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  {view.title}
                </h2>
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

            {lastLetter && (
              <div className="flex flex-col gap-2.5 border-b border-line px-5 py-4">
                <div className="eyebrow">Сүүлд илгээсэн мэдэгдэл</div>
                <div className="text-[12.5px] font-semibold">{lastLetter.subject}</div>
                <pre className="rounded-lg border border-line bg-surface-2 p-3.5 text-[12.5px] leading-relaxed whitespace-pre-wrap">
                  {lastLetter.body}
                </pre>
                <div className="flex flex-wrap gap-1.5">
                  {lastLetter.recipients.map((r) => (
                    <em
                      key={r.name}
                      className={`rounded-full border px-2 py-0.5 text-[11px] not-italic ${
                        r.escalated
                          ? "border-transparent bg-crit-soft font-semibold text-crit"
                          : "border-line bg-surface-3 text-ink-2"
                      }`}
                    >
                      {r.name} — {r.role}
                    </em>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 px-5 py-4">
              {view.submittedAt ? (
                <button className="btn" disabled={pending} onClick={() => act(undoSubmitAction)}>
                  Ирүүлэлтийг цуцлах
                </button>
              ) : (
                <button className="btn btn-primary" disabled={pending} onClick={() => act(markSubmittedAction)}>
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
