type ChartPoint = {
  label: string;
  value: number;
};

type ChartCardProps = {
  title: string;
  eyebrow: string;
  summary: string;
  points: ChartPoint[];
};

export function ChartCard({ title, eyebrow, summary, points }: ChartCardProps) {
  const peak = Math.max(...points.map((point) => point.value), 1);

  return (
    <article className="rounded-[2rem] border border-[hsl(var(--dashboard-border))] bg-[linear-gradient(180deg,rgba(12,18,31,0.96),rgba(9,14,24,0.96))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/75">{eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[hsl(var(--dashboard-muted))]">{summary}</p>
      </div>

      <div className="mt-8 grid grid-cols-6 items-end gap-3">
        {points.map((point) => (
          <div key={point.label} className="flex flex-col items-center gap-3">
            <div className="flex h-48 w-full items-end rounded-[1.5rem] border border-white/6 bg-white/[0.03] p-2">
              <div
                className="w-full rounded-[1rem] bg-[linear-gradient(180deg,rgba(91,241,255,0.95),rgba(17,126,208,0.55))] shadow-[0_14px_28px_rgba(34,211,238,0.22)]"
                style={{ height: `${Math.max((point.value / peak) * 100, 16)}%` }}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-100">{point.label}</p>
              <p className="mt-1 text-xs text-[hsl(var(--dashboard-muted))]">{point.value}%</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
