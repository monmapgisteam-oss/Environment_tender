"use client";

import { useState, useTransition } from "react";
import { IconAlert, IconChevronLeft, IconChevronRight } from "@/components/icons";
import { setReviewDateAction } from "@/lib/actions";
import { diffDays } from "@/lib/date";

const WEEKDAYS = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
const MONTHS = [
  "1 дүгээр сар", "2 дугаар сар", "3 дугаар сар", "4 дүгээр сар",
  "5 дугаар сар", "6 дугаар сар", "7 дугаар сар", "8 дугаар сар",
  "9 дүгээр сар", "10 дугаар сар", "11 дүгээр сар", "12 дугаар сар",
];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function Calendar({
  reviewDate,
  deadlines,
  notesByDay,
}: {
  reviewDate: string;
  /** Эцсийн хугацаа тохиох өдөр → тухайн өдөр дуусах ажлын тоо */
  deadlines: Record<string, number>;
  notesByDay: Record<string, number>;
}) {
  const [year0, month0] = reviewDate.split("-").map(Number);
  const [cursor, setCursor] = useState({ y: year0, m: month0 - 1 });
  const [pending, start] = useTransition();

  const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
  const days = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const prefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}`;
  const monthNotes = Object.entries(notesByDay)
    .filter(([d]) => d.startsWith(prefix))
    .reduce((a, [, v]) => a + v, 0);

  // Хамгийн ойрын эцсийн хугацаа — өнөөдрөөс хойш, байхгүй бол сүүлд өнгөрсөн нь
  const dates = Object.keys(deadlines).sort();
  const upcoming = dates.find((d) => diffDays(d, reviewDate) >= 0);
  const past = [...dates].reverse().find((d) => diffDays(d, reviewDate) < 0);
  const alertDate = upcoming ?? past;
  const alertLeft = alertDate ? diffDays(alertDate, reviewDate) : 0;

  const shift = (step: number) => {
    const m = cursor.m + step;
    setCursor({ y: cursor.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold">
          {MONTHS[cursor.m]}, {cursor.y}
        </span>
        <span className="flex gap-1">
          <button
            onClick={() => shift(-1)}
            aria-label="Өмнөх сар"
            className="grid size-6 place-items-center rounded-md border border-line text-ink-3 hover:text-ink"
          >
            <IconChevronLeft className="size-3.5" />
          </button>
          <button
            onClick={() => shift(1)}
            aria-label="Дараах сар"
            className="grid size-6 place-items-center rounded-md border border-line text-ink-3 hover:text-ink"
          >
            <IconChevronRight className="size-3.5" />
          </button>
        </span>
      </div>

      <div className="grid grid-cols-7 gap-x-1 gap-y-0.5 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="eyebrow pb-0.5">
            {w}
          </span>
        ))}

        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const date = iso(cursor.y, cursor.m, d);
          const selected = date === reviewDate;
          const dueCount = deadlines[date] ?? 0;
          const notes = notesByDay[date] ?? 0;
          return (
            <button
              key={date}
              onClick={() => start(() => void setReviewDateAction(date))}
              disabled={pending}
              title={[
                dueCount ? `${dueCount} ажлын эцсийн хугацаа` : "",
                notes ? `${notes} мэдэгдэл илгээсэн` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              className={`num relative rounded-md border py-[3px] text-[11.5px] ${
                selected
                  ? "border-accent bg-accent font-semibold text-ground"
                  : dueCount
                    ? "border-crit/70 font-semibold text-crit hover:bg-surface-3"
                    : "border-transparent text-ink-2 hover:bg-surface-3"
              }`}
            >
              {d}
              {notes > 0 && !selected && (
                <i className="absolute bottom-0.5 left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-warn" />
              )}
            </button>
          );
        })}
      </div>

      {/* Эцсийн хугацааны анхааруулга */}
      {alertDate && (
        <div
          className="flex items-center gap-2 rounded-lg border px-2.5 py-1"
          style={{
            borderColor: alertLeft < 0 ? "var(--crit)" : alertLeft <= 14 ? "var(--warn)" : "var(--line)",
            background: alertLeft < 0 ? "var(--crit-soft)" : alertLeft <= 14 ? "var(--warn-soft)" : "var(--surface-2)",
          }}
        >
          <IconAlert
            className="size-3.5 flex-none"
            style={{ color: alertLeft < 0 ? "var(--crit)" : alertLeft <= 14 ? "var(--warn)" : "var(--ink-3)" }}
          />
          <span className="min-w-0 text-[11px] text-ink-2">
            <b className="num font-semibold text-ink">{alertDate}</b> — {deadlines[alertDate]} ажлын эцсийн хугацаа
            {alertLeft < 0 ? (
              <span style={{ color: "var(--crit)" }}> · {-alertLeft} хоногийн өмнө дууссан</span>
            ) : alertLeft === 0 ? (
              <span style={{ color: "var(--crit)" }}> · өнөөдөр дуусна</span>
            ) : (
              <span style={{ color: alertLeft <= 14 ? "var(--warn)" : "var(--ink-3)" }}>
                {" "}
                · {alertLeft} хоног үлдлээ
              </span>
            )}
          </span>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2 text-[10px] text-ink-3">
        <span>
          Энэ сард <b className="num font-semibold text-ink-2">{monthNotes}</b> мэдэгдэл
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] border border-crit/70" />
          эцсийн хугацаа
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-[3px] rounded-full bg-warn" />
          мэдэгдэл гарсан
        </span>
      </div>
    </div>
  );
}
