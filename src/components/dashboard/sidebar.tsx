import Link from "next/link";
import type { AppRole } from "@/lib/permissions";

type SidebarProps = {
  businessName: string;
  role: AppRole;
};

type SidebarNavigationItem =
  | { label: string; active: boolean; available: true; href: string }
  | { label: string; active: boolean; available: false };

const primaryNavigation: SidebarNavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", active: true, available: true },
  { label: "Clients", href: "/clients", active: false, available: true },
  { label: "Invoices", href: "/invoices", active: false, available: true },
  { label: "Recurring", href: "/recurring", active: false, available: true },
  { label: "Payments", href: "/payments", active: false, available: true },
];

const secondaryNavigation = [
  "Team permissions",
  "Settings",
];

export function Sidebar({ businessName, role }: SidebarProps) {
  return (
    <aside className="flex min-h-full flex-col rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(8,12,22,0.98),rgba(5,9,18,0.98))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
      <div>
        <p className="text-xs uppercase tracking-[0.38em] text-cyan-300/80">Flow command</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">{businessName}</h1>
        <p className="mt-3 max-w-xs text-sm leading-6 text-[hsl(var(--dashboard-muted))]">
          Premium operating system for revenue, billing, and the team routines that keep your
          business moving.
        </p>
      </div>

      <nav aria-label="Primary" className="mt-10 space-y-3">
        {primaryNavigation.map((item) => (
          item.available ? (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`flex items-center justify-between rounded-[1.35rem] border px-4 py-3 text-sm font-medium transition ${
                item.active
                  ? "border-cyan-300/18 bg-cyan-300/[0.10] text-white"
                  : "border-white/6 bg-white/[0.03] text-slate-300 hover:border-white/12 hover:bg-white/[0.05]"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                {item.active ? "Live" : "Soon"}
              </span>
            </Link>
          ) : (
            <div
              key={item.label}
              aria-disabled="true"
              className="flex items-center justify-between rounded-[1.35rem] border border-white/6 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-300"
            >
              <span>{item.label}</span>
              <span className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Soon</span>
            </div>
          )
        ))}
      </nav>

      <div className="mt-10 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/70">Admin access</p>
        <p className="mt-3 text-xl font-semibold text-white">{role}</p>
        <ul className="mt-4 space-y-3 text-sm text-[hsl(var(--dashboard-muted))]">
          {secondaryNavigation.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
