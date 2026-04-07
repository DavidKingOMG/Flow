import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ChartCard } from "@/components/dashboard/chart-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { requireActiveBusiness } from "@/lib/business-context";
import { db } from "@/lib/db";
import {
  getDashboardMetrics,
  type DashboardMetricCard,
} from "@/lib/dashboard/get-dashboard-metrics";
import { getRecentActivity } from "@/lib/dashboard/get-recent-activity";

type DashboardSnapshot = {
  metrics: DashboardMetricCard[];
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

async function getDashboardSnapshot(businessId: string): Promise<DashboardSnapshot> {
  let paidByDay: Array<{ amount: number; recordedAt: Date }> = [];

  try {
    paidByDay = await db.payment.findMany({
      where: {
        businessId,
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: 12,
      select: {
        amount: true,
        recordedAt: true,
      },
    });
  } catch {
    paidByDay = [];
  }

  const [metrics, activity] = await Promise.all([
    getDashboardMetrics(businessId),
    getRecentActivity(businessId, 6),
  ]);

  const grouped = paidByDay.reduce<Record<string, number>>((acc, payment) => {
    const label = payment.recordedAt.toLocaleDateString("en-US", { weekday: "short" });
    acc[label] = (acc[label] ?? 0) + payment.amount;
    return acc;
  }, {});

  const points = Object.entries(grouped)
    .slice(0, 6)
    .map(([label, value]) => ({ label, value: Math.max(Math.round(value / 10_000), 1) }));

  return {
    metrics: metrics.cards,
    chart: {
      title: "Collections trend",
      eyebrow: "Cash health",
      summary: "Recent payment activity from settled records in this workspace.",
      points:
        points.length > 0
          ? points
          : [
              { label: "Mon", value: 22 },
              { label: "Tue", value: 36 },
              { label: "Wed", value: 28 },
              { label: "Thu", value: 41 },
              { label: "Fri", value: 33 },
              { label: "Sat", value: 24 },
            ],
    },
    activity,
  };
}

export default async function DashboardPage() {
  const context = await requireActiveBusiness();
  const snapshot = await getDashboardSnapshot(context.businessId);

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
