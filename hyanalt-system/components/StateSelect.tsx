"use client";

import { setNbogState, setVendorState } from "@/lib/store";
import type { NbogState, VendorState } from "@/lib/types";

/** НБОГ талын сонголтууд */
export const NBOG_OPTIONS: { value: NbogState; label: string; color: string; soft: string }[] = [
  { value: "wait_vendor", label: "Монмэп-с хүлээгдэж буй", color: "var(--info)", soft: "var(--info-soft)" },
  { value: "wait_client", label: "НБОГ-с хүлээгдэж буй", color: "var(--ok)", soft: "var(--ok-soft)" },
  { value: "in_progress", label: "Хийгдэж байгаа", color: "var(--warn)", soft: "var(--warn-soft)" },
  { value: "done", label: "Дууссан", color: "var(--plum)", soft: "var(--plum-soft)" },
];

/** Монмэп талын сонголтууд */
export const VENDOR_OPTIONS: { value: VendorState; label: string; color: string; soft: string }[] = [
  { value: "yes", label: "Тийм", color: "var(--ok)", soft: "var(--ok-soft)" },
  { value: "in_progress", label: "Хийгдэж байгаа", color: "var(--warn)", soft: "var(--warn-soft)" },
];

/**
 * Гар удирдлагатай төлөв — сонгосон утгын өнгөөр будагдана.
 * Хоосон утга нь "тэмдэглээгүй" гэсэн үг.
 */
export function StateSelect({
  side,
  milestoneId,
  value,
  width = 150,
}: {
  side: "nbog" | "vendor";
  milestoneId: string;
  value?: string;
  width?: number;
}) {
  const options = side === "nbog" ? NBOG_OPTIONS : VENDOR_OPTIONS;
  const active = options.find((o) => o.value === value);

  return (
    <select
      value={value ?? ""}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        const v = e.target.value || undefined;
        if (side === "nbog") setNbogState(milestoneId, v as NbogState | undefined);
        else setVendorState(milestoneId, v as VendorState | undefined);
      }}
      className="cursor-pointer rounded-md border px-1.5 py-[3px] text-[10.5px] outline-none"
      style={{
        width,
        borderColor: active ? "transparent" : "var(--line)",
        background: active ? active.soft : "transparent",
        color: active ? active.color : "var(--ink-3)",
      }}
    >
      <option value="">— сонгох —</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
