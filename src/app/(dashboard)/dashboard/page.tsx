import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ChartCard } from "@/components/dashboard/chart-card";
import { StatCard } from "@/components/dashboard/stat-card";

type DashboardSnapshot = {
  metrics: Array<{
    label: string;
    value: string;
    delta: string;
    tone: "accent" | "warning" | "success";
  }>;
  chart: {
    title: string;
    eyebrow: string;
    summary: string;
    points: Array<{ label: string; value: number }>;
  };
  activity: Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
};

async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  return {
    metrics: [
      {
        label: "Revenue collected",
        value: "$128,400",
        delta: "+14.8%",
        tone: "success",
      },
      {
        label: "Overdue invoices",
        value: "08",
        delta: "Needs attention",
        tone: "warning",
      },
      {
        label: "Cash runway secured",
        value: "42 days",
        delta: "Forecast stable",
        tone: "accent",
      },
    ],
    chart: {
      title: "Collections trend",
      eyebrow: "Cash health",
      summary:
        "Placeholder recovery trend until invoice and payment modules begin feeding live analytics.",
      points: [
        { label: "Mon", value: 46 },
        { label: "Tue", value: 58 },
        { label: "Wed", value: 52 },
        { label: "Thu", value: 73 },
        { label: "Fri", value: 81 },
        { label: "Sat", value: 62 },
      ],
    },
    activity: [
      {
        id: "activity_1",
        title: "Retainer payment recorded",
        description: "Studio Morrow settled INV-1842 for $12,800 through an offline bank transfer.",
        timestamp: "12 min ago",
      },
      {
        id: "activity_2",
        title: "Three invoices approaching due date",
        description: "Collections queue flagged accounts that should receive reminders before noon.",
        timestamp: "48 min ago",
      },
      {
        id: "activity_3",
        title: "Recurring billing run staged",
        description: "Monday service retainers are lined up for generation once recurring workflows land.",
        timestamp: "Today",
      },
    ],
  };
}

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(14,23,38,0.96),rgba(8,11,20,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.36em] text-cyan-300/75">Admin overview</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Business performance overview
          </h1>
          <p className="mt-4 text-base leading-7 text-[hsl(var(--dashboard-muted))]">
            A premium control layer for revenue visibility, collections pressure, and operational
            moments that need an owner before they become billing risk.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {snapshot.metrics.map((metric) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            delta={metric.delta}
            tone={metric.tone}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)]">
        <ChartCard
          title={snapshot.chart.title}
          eyebrow={snapshot.chart.eyebrow}
          summary={snapshot.chart.summary}
          points={snapshot.chart.points}
        />
        <ActivityFeed items={snapshot.activity} />
      </section>
    </div>
  );
}
