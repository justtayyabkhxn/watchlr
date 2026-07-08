"use client";

/**
 * Hand-rolled chart primitives on the Watchr palette.
 * Single-measure magnitude charts → one hue (accent), sequential ramp
 * for the heatmap, direct labels + native tooltips on every mark.
 */

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  count: number;
  minutes: number;
}

/* Sequential accent ramp (monotonic lightness), 0 = empty neutral */
const HEAT_RAMP = ["#f2ede3", "#ffdfa8", "#f5b97e", "#f59e52", "#c96f28"];

export function heatColor(count: number): string {
  if (count <= 0) return HEAT_RAMP[0];
  return HEAT_RAMP[Math.min(count, HEAT_RAMP.length - 1)];
}

export function StatTile({
  value,
  label,
  rotate = "",
}: {
  value: string;
  label: string;
  rotate?: string;
}) {
  return (
    <div className={`rounded-3xl border-2 border-ink bg-card p-4 shadow-offset transition-transform duration-200 hover:-translate-y-1 sm:p-6 ${rotate}`}>
      <p className="text-offset text-3xl font-black tracking-tight sm:text-5xl">{value}</p>
      <p className="mt-1 text-xs font-black text-muted">{label}</p>
    </div>
  );
}

/** Vertical weekly bar chart — last 12 weeks, direct max label, tooltips per bar. */
export function WeeklyBars({ daily }: { daily: DailyPoint[] }) {
  // Bucket days into 12 ISO-ish weeks ending today.
  const byDate = new Map(daily.map((d) => [d.date, d.count]));
  const weeks: { label: string; count: number }[] = [];
  const today = new Date();
  const day = new Date(today);
  day.setDate(day.getDate() - day.getDay() - 7 * 11); // start of week, 11 weeks back

  for (let w = 0; w < 12; w++) {
    let count = 0;
    const weekStart = new Date(day);
    for (let i = 0; i < 7; i++) {
      const key = day.toISOString().slice(0, 10);
      count += byDate.get(key) ?? 0;
      day.setDate(day.getDate() + 1);
    }
    weeks.push({
      label: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count,
    });
  }

  const max = Math.max(1, ...weeks.map((w) => w.count));

  return (
    <div>
      <div className="flex h-40 items-end gap-[2px]" role="img" aria-label="Watches per week, last 12 weeks">
        {weeks.map((w, i) => (
          <div key={i} className="group/bar relative flex h-full flex-1 flex-col justify-end" title={`Week of ${w.label}: ${w.count} watch${w.count === 1 ? "" : "es"}`}>
            {w.count === max && w.count > 0 && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-black">{w.count}</span>
            )}
            <div
              className="w-full rounded-t-[4px] bg-accent transition-colors group-hover/bar:bg-ink"
              style={{ height: `${Math.max((w.count / max) * 100, w.count > 0 ? 4 : 2)}%`, backgroundColor: w.count === 0 ? "#f2ede3" : undefined }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold text-muted">
        <span>{weeks[0].label}</span>
        <span>{weeks[weeks.length - 1].label}</span>
      </div>
    </div>
  );
}

/** Horizontal genre bars — single hue, name + direct value label. */
export function GenreBars({ genres }: { genres: { name: string; count: number }[] }) {
  if (genres.length === 0) {
    return <p className="text-sm text-muted">Watch a few things and your taste shows up here.</p>;
  }
  const max = Math.max(...genres.map((g) => g.count));

  return (
    <ul className="space-y-3">
      {genres.map((g) => (
        <li key={g.name} className="group/genre" title={`${g.name}: ${g.count} watches`}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-bold">{g.name}</span>
            <span className="text-xs font-black text-muted">{g.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#f2ede3]">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500 group-hover/genre:bg-ink"
              style={{ width: `${(g.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** GitHub-style calendar heatmap — 20 weeks × 7 days, sequential ramp, tooltips. */
export function CalendarHeatmap({ daily }: { daily: DailyPoint[] }) {
  const byDate = new Map(daily.map((d) => [d.date, d.count]));
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - 7 * 19); // 20 full weeks

  const weeks: { date: string; count: number; future: boolean }[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 20; w++) {
    const col: { date: string; count: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const key = cursor.toISOString().slice(0, 10);
      col.push({ date: key, count: byDate.get(key) ?? 0, future: cursor > today });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(col);
  }

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1" role="img" aria-label="Daily watch activity, last 20 weeks">
        {weeks.map((col, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {col.map((cell) => (
              <div
                key={cell.date}
                title={
                  cell.future
                    ? undefined
                    : `${new Date(cell.date + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${cell.count} watch${cell.count === 1 ? "" : "es"}`
                }
                className="size-3.5 rounded-[4px] transition-transform hover:scale-125"
                style={{
                  backgroundColor: cell.future ? "transparent" : heatColor(cell.count),
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-muted">
        less
        {HEAT_RAMP.map((c) => (
          <span key={c} className="size-3 rounded-[3px]" style={{ backgroundColor: c }} />
        ))}
        more
      </div>
    </div>
  );
}
