import type { AppRole } from "@/lib/permissions";

type TopbarProps = {
  businessName: string;
  role: AppRole;
};

export function Topbar({ businessName, role }: TopbarProps) {
  return (
    <header
      role="banner"
      className="flex flex-col gap-4 rounded-[2rem] border border-[hsl(var(--dashboard-border))] bg-[linear-gradient(180deg,rgba(10,15,25,0.94),rgba(7,11,19,0.94))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] lg:flex-row lg:items-center lg:justify-between"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/75">Operator view</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          Welcome back to {businessName}
        </h2>
        <p className="mt-2 text-sm text-[hsl(var(--dashboard-muted))]">
          Revenue, invoicing, and payment visibility in one protected workspace.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200">
          Team sync at 09:30
        </div>
        <div className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.10] px-4 py-2 text-sm font-medium uppercase tracking-[0.2em] text-cyan-100">
          {role}
        </div>
      </div>
    </header>
  );
}
