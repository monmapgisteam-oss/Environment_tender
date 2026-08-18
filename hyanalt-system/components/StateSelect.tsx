"use client";

import { useEffect, useRef, useState } from "react";
import { setNbogState, setVendorState } from "@/lib/store";
import type { NbogState, VendorState } from "@/lib/types";

interface Option {
  value: string;
  label: string;
  color: string;
  soft: string;
}

/** НБОГ талын сонголтууд */
export const NBOG_OPTIONS: Option[] = [
  { value: "waiting", label: "НБОГ-оос хүлээгдэж буй", color: "var(--info)", soft: "var(--info-soft)" },
  { value: "working", label: "Хийгдэж байгаа", color: "var(--warn)", soft: "var(--warn-soft)" },
  { value: "done", label: "Дууссан", color: "var(--ok)", soft: "var(--ok-soft)" },
];

/** Монмэп талын сонголтууд */
export const VENDOR_OPTIONS: Option[] = [
  { value: "working", label: "Хийгдэж байгаа", color: "var(--warn)", soft: "var(--warn-soft)" },
  { value: "done", label: "Дууссан, системд орсон", color: "var(--plum)", soft: "var(--plum-soft)" },
];

/**
 * Гар удирдлагатай төлөв — системийн дизайнтай нийцсэн унждаг цэс.
 * Цэсийг fixed байрлалаар зурдаг тул гүйдэг жагсаалтын ирмэгт таслагдахгүй.
 */
export function StateSelect({
  side,
  milestoneId,
  value,
  width = 130,
}: {
  side: "nbog" | "vendor";
  milestoneId: string;
  value?: string;
  width?: number;
}) {
  const options = side === "nbog" ? NBOG_OPTIONS : VENDOR_OPTIONS;
  const active = options.find((o) => o.value === value);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // Гүйлгэх, цонх өөрчлөгдөх, өөр газар дарахад хаагдана
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      const menuHeight = options.length * 28 + 34;
      const below = window.innerHeight - r.bottom;
      setPos({ top: below > menuHeight ? r.bottom + 4 : r.top - menuHeight - 4, left: r.left });
    }
    setOpen((v) => !v);
  };

  const pick = (e: React.MouseEvent, v?: string) => {
    e.stopPropagation();
    if (side === "nbog") setNbogState(milestoneId, v as NbogState | undefined);
    else setVendorState(milestoneId, v as VendorState | undefined);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[10.5px]"
        style={{
          width,
          borderColor: active ? "transparent" : "var(--line)",
          background: active ? active.soft : "transparent",
          color: active ? active.color : "var(--ink-3)",
        }}
      >
        {active && <i className="size-1.5 flex-none rounded-full" style={{ background: active.color }} />}
        <span className="min-w-0 flex-1 truncate text-left">{active?.label ?? "сонгох"}</span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" className="flex-none opacity-70">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 overflow-hidden rounded-lg border border-line-2 bg-surface py-1 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.7)]"
          style={{ top: pos.top, left: pos.left, width: Math.max(width, 180) }}
        >
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                role="option"
                aria-selected={on}
                type="button"
                onClick={(e) => pick(e, o.value)}
                className="flex w-full items-center gap-2 px-2 py-[5px] text-left text-[11px] hover:bg-surface-2"
                style={{ color: o.color, background: on ? o.soft : undefined }}
              >
                <i className="size-1.5 flex-none rounded-full" style={{ background: o.color }} />
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={(e) => pick(e, undefined)}
            className="mt-1 flex w-full items-center gap-2 border-t border-line px-2 py-[5px] text-left text-[11px] text-ink-3 hover:bg-surface-2"
          >
            Тэмдэглэгээг арилгах
          </button>
        </div>
      )}
    </>
  );
}
