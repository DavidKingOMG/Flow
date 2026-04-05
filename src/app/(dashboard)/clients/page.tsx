import Link from "next/link";
import { db } from "@/lib/db";
import { requireActiveBusiness } from "@/lib/business-context";

async function getClients() {
  const context = await requireActiveBusiness();

  return db.client.findMany({
    where: {
      businessId: context.businessId,
    },
    orderBy: [
      { createdAt: "desc" },
      { fullName: "asc" },
    ],
    select: {
      id: true,
      fullName: true,
      companyName: true,
      email: true,
      phone: true,
      username: true,
      status: true,
      userId: true,
      createdAt: true,
    },
  });
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(14,23,38,0.96),rgba(8,11,20,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.36em] text-cyan-300/75">Client management</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Clients</h1>
          <p className="mt-4 text-base leading-7 text-[hsl(var(--dashboard-muted))]">
            Track first-class client records whether they only need contact details or a linked login.
          </p>
        </div>

        <Link
          href="/clients/new"
          className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200"
        >
          Add client
        </Link>
      </section>

      {clients.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-white/12 bg-white/[0.02] p-8 text-center">
          <h2 className="text-2xl font-semibold text-white">No clients yet</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Create your first client record to store contact details now and optionally add portal access.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[2rem] border border-white/8 bg-white/[0.03]">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_180px] gap-4 border-b border-white/8 px-6 py-4 text-xs uppercase tracking-[0.24em] text-slate-400">
            <span>Client</span>
            <span>Contact</span>
            <span>Access</span>
            <span>Status</span>
          </div>

          <div className="divide-y divide-white/6">
            {clients.map((client) => (
              <article
                key={client.id}
                className="grid grid-cols-1 gap-4 px-6 py-5 text-sm text-slate-200 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_180px]"
              >
                <div>
                  <p className="font-medium text-white">{client.fullName}</p>
                  <p className="mt-1 text-slate-400">{client.companyName ?? "Independent client"}</p>
                </div>
                <div>
                  <p>{client.email}</p>
                  <p className="mt-1 text-slate-400">{client.phone}</p>
                </div>
                <div>
                  <p>{client.userId ? "Login enabled" : "Record only"}</p>
                  <p className="mt-1 text-slate-400">{client.username ?? "No username"}</p>
                </div>
                <div className="flex items-center">
                  <span className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.10] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">
                    {client.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
