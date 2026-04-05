type StatCardProps = {
  label: string;
  value: string;
  delta: string;
  tone?: "accent" | "warning" | "success";
};

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  accent: "border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-100",
  warning: "border-amber-300/15 bg-amber-300/[0.08] text-amber-100",
  success: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-100",
};

export function StatCard({ label, value, delta, tone = "accent" }: StatCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-panel))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[hsl(var(--dashboard-muted))]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] ${toneStyles[tone]}`}
        >
          {delta}
        </span>
      </div>
    </article>
  );
}
