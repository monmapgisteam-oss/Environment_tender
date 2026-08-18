/** Гадаад сангүй, цэвэр SVG график. Өнгө хэмнэсэн — нэг цуваа л дүүргэлттэй. */

const W = 1000;
const H = 300;
const PAD_T = 14;
const PAD_B = 10;

export interface Series {
  id: string;
  name: string;
  color: string;
  /** null утга нь тухайн цэгээс хойш өгөгдөл байхгүйг заана */
  values: (number | null)[];
  /** Доогуур нь уусах дүүргэлт хийх эсэх */
  fill?: boolean;
  /** Тасархай шугамаар зурах эсэх (лавлах цуваа) */
  dash?: boolean;
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const [x3, y3] = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}

export function AreaChart({
  series,
  labels,
  max,
  markerIndex,
}: {
  series: Series[];
  labels: string[];
  max: number;
  markerIndex?: number;
}) {
  const n = labels.length;
  const x = (i: number) => (i / Math.max(1, n - 1)) * W;
  const y = (v: number) => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Өндөр нь эцэг элементээсээ уян хатан тодорхойлогдоно */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ height: "100%", width: "100%", display: "block", minHeight: 0, flex: 1 }}
        role="img"
        aria-label="Гүйцэтгэлийн явцын график"
      >
        <defs>
          {series
            .filter((s) => s.fill)
            .map((s) => (
              <linearGradient key={s.id} id={`grad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
        </defs>

        {[0, 0.5, 1].map((g) => (
          <line
            key={g}
            x1="0"
            x2={W}
            y1={PAD_T + g * (H - PAD_T - PAD_B)}
            y2={PAD_T + g * (H - PAD_T - PAD_B)}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {series.map((s) => {
          const pts = s.values
            .map((v, i) => (v === null ? null : ([x(i), y(v)] as [number, number])))
            .filter((p): p is [number, number] => p !== null);
          if (pts.length < 2) return null;
          const line = smoothPath(pts);
          const last = pts[pts.length - 1];
          return (
            <g key={s.id}>
              {s.fill && (
                <path d={`${line} L ${last[0]} ${H - PAD_B} L ${pts[0][0]} ${H - PAD_B} Z`} fill={`url(#grad-${s.id})`} />
              )}
              <path
                d={line}
                fill="none"
                stroke={s.color}
                strokeWidth={s.dash ? 1.2 : 1.8}
                strokeDasharray={s.dash ? "5 5" : undefined}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {!s.dash && (
                <circle
                  cx={last[0]}
                  cy={last[1]}
                  r="3"
                  fill="var(--ground)"
                  stroke={s.color}
                  strokeWidth="1.6"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </g>
          );
        })}

        {markerIndex !== undefined && (
          <line
            x1={x(markerIndex)}
            x2={x(markerIndex)}
            y1={0}
            y2={H - PAD_B}
            stroke="var(--line-2)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <div className="num mt-1.5 flex justify-between text-[9.5px] text-ink-3">
        {labels.map((l, i) => (
          <span key={i} className="flex-1 text-center first:text-left last:text-right">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Цагираган диаграм — тайлбар нь хажуудаа */
export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 118,
}: {
  segments: { label: string; value: number; color: string }[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const shown = segments.filter((s) => s.value > 0);
  const sum = shown.reduce((a, s) => a + s.value, 0) || 1;
  const arcs = shown.reduce<{ seg: (typeof shown)[number]; start: number; len: number }[]>((acc, s) => {
    const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].len : 0;
    acc.push({ seg: s, start, len: (s.value / sum) * c });
    return acc;
  }, []);

  return (
    <div className="flex min-h-0 flex-1 items-center gap-4">
      <div className="relative flex-none" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" width={size} height={size} className="-rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="11" />
          {arcs.map(({ seg, start, len }) => {
            const visible = Math.max(0, len - (arcs.length > 1 ? 2 : 0));
            return (
              <circle
                key={seg.label}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="11"
                strokeDasharray={`${visible} ${c - visible}`}
                strokeDashoffset={-start}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="stat text-[20px]">{centerValue}</div>
            <div className="text-[9.5px] text-ink-3">{centerLabel}</div>
          </div>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[11.5px]">
            <i className="block size-1.5 flex-none rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{s.label}</span>
            <b className="num text-[11px] font-medium text-ink-2">{s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
