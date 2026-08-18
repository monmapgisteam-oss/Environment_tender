import { STATUS_LABEL } from "@/lib/escalation";
import type { Status } from "@/lib/types";

/** Төлөв бүрийн өнгө — диаграм, зурвас, судалд ашиглана */
export const STATUS_COLOR: Record<Status, string> = {
  planned: "var(--surface-3)",
  active: "var(--data)",
  warn1: "var(--warn)",
  warn2: "var(--warn)",
  level2: "var(--crit)",
  level3: "var(--sev)",
  done: "var(--ok)",
  late: "var(--ok)",
};

export function StatusPill({ status }: { status: Status }) {
  return <span className={`pill pill-${status}`}>{STATUS_LABEL[status]}</span>;
}
