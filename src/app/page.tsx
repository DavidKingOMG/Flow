const dashboardMetrics = [
  { label: "Live revenue", value: "$128.4k" },
  { label: "Open invoices", value: "24" },
  { label: "On-time collection", value: "96%" },
];

const activityItems = [
  "Business operations view for owners and operators",
  "Invoice workflows, payments, and recurring billing at a glance",
  "Built for premium service businesses that need clarity fast",
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(53,214,255,0.18),_transparent_30%),linear-gradient(180deg,#07101b_0%,#050814_55%,#04060b_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.42em] text-cyan-300/80">Flow</p>
            <p className="mt-2 text-sm text-slate-300">Premium business operations, simplified.</p>
          </div>
          <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
            New workspace ready
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
              Business operations dashboard for modern service teams
            </p>
            <h1 className="mt-8 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Flow keeps your operations calm, clear, and client-ready.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              A dark premium landing foundation for Flow, built to surface the work that matters:
              revenue, invoices, payments, and team activity in one place.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#dashboard-preview"
                className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-medium text-slate-950 shadow-glow transition hover:bg-cyan-200"
              >
                Explore Flow
              </a>
              <a
                href="#dashboard-preview"
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/10"
              >
                See the dashboard
              </a>
            </div>
          </div>

          <div
            id="dashboard-preview"
            className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur"
          >
            <div className="rounded-[1.5rem] border border-white/10 bg-[#09111d] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Today</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Business operating dashboard</h2>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-cyan-300/10" />
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {dashboardMetrics.map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm text-slate-400">{metric.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
                  </article>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/8 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Operational focus</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                  {activityItems.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
