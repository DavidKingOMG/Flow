type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
};

type ActivityFeedProps = {
  items: ActivityItem[];
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <section className="rounded-[2rem] border border-[hsl(var(--dashboard-border))] bg-[hsl(var(--dashboard-panel))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/75">Operations log</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Recent activity</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.24em] text-[hsl(var(--dashboard-muted))]">
          Live pulse
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[1.5rem] border border-white/6 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-medium text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--dashboard-muted))]">
                  {item.description}
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                {item.timestamp}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
