/** Огнооны туслах функцууд. Огноог "YYYY-MM-DD" тэмдэгт мөрөөр илэрхийлнэ. */

const DAY = 86_400_000;

export function toNum(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function toIso(n: number): string {
  return new Date(n).toISOString().slice(0, 10);
}

/** a - b (хоногоор) */
export function diffDays(a: string, b: string): number {
  return Math.round((toNum(a) - toNum(b)) / DAY);
}

export function addDays(iso: string, days: number): string {
  return toIso(toNum(iso) + days * DAY);
}

/** Амралтын өдөрт таарвал өмнөх ажлын өдөр рүү шилжүүлнэ */
export function toBusinessDay(iso: string): string {
  const n = toNum(iso);
  const w = new Date(n).getUTCDay();
  if (w === 6) return toIso(n - DAY);
  if (w === 0) return toIso(n - 2 * DAY);
  return iso;
}

/** "2026-01" → "2026-01-31" (тухайн сарын сүүлийн өдөр) */
export function monthEnd(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return toIso(Date.UTC(y, m, 0));
}

/** "2026-12" → "2027-01" */
export function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const MONTHS = [
  "1 дүгээр сар", "2 дугаар сар", "3 дугаар сар", "4 дүгээр сар",
  "5 дугаар сар", "6 дугаар сар", "7 дугаар сар", "8 дугаар сар",
  "9 дүгээр сар", "10 дугаар сар", "11 дүгээр сар", "12 дугаар сар",
];

/** 2026-08-31 → "2026 оны 8 дугаар сарын 31-ний өдөр" */
export function formatLong(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y} оны ${MONTHS[Number(m) - 1]}ын ${Number(d)}-ны өдөр`;
}

/** Тогтвортой (санамсаргүй бус) хэш — туршилтын өгөгдөл үүсгэхэд */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
