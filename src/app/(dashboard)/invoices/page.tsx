import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDateOnly } from "@/lib/invoices/date-only";
import { assertBillingAccess, BillingAccessError } from "@/lib/invoices/authorization";
import { getInvoiceStatusUpdate, type InvoiceStatusValue } from "@/lib/invoices/status";
import { requireActiveBusiness } from "@/lib/business-context";
import { db } from "@/lib/db";

async function getInvoices() {
  const context = await requireActiveBusiness();
  assertBillingAccess(context);

  const invoices = await db.invoice.findMany({
    where: {
      businessId: context.businessId,
    },
    orderBy: [{ createdAt: "desc" }, { invoiceNumber: "desc" }],
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      total: true,
      paidAmount: true,
      dueAt: true,
      client: {
        select: {
          fullName: true,
          companyName: true,
        },
      },
    },
  });

  const staleStatuses = invoices
    .map((invoice) => ({
      id: invoice.id,
      nextStatus: getInvoiceStatusUpdate({
        currentStatus: invoice.status,
        total: invoice.total,
        paidAmount: invoice.paidAmount,
        dueDate: invoice.dueAt,
      }),
    }))
    .filter((invoice): invoice is { id: string; nextStatus: InvoiceStatusValue } => invoice.nextStatus !== null);

  if (staleStatuses.length > 0) {
    await db.$transaction(
      staleStatuses.map((invoice) =>
        db.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            status: invoice.nextStatus,
          },
        }),
      ),
    );
  }

  return invoices.map((invoice) => {
    const statusUpdate = staleStatuses.find((candidate) => candidate.id === invoice.id);

    return {
      ...invoice,
      status: statusUpdate?.nextStatus ?? invoice.status,
    };
  });
}

export default async function InvoicesPage() {
  let invoices;

  try {
    invoices = await getInvoices();
  } catch (error) {
    if (error instanceof BillingAccessError) {
      redirect("/dashboard");
    }

    throw error;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(14,23,38,0.96),rgba(8,11,20,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.36em] text-cyan-300/75">Billing workflow</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Invoices</h1>
          <p className="mt-4 text-base leading-7 text-[hsl(var(--dashboard-muted))]">
            Track invoice numbers, statuses, and balances without reaching into payments or recurring billing yet.
          </p>
        </div>

        <Link
          href="/invoices/new"
          className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200"
        >
          New invoice
        </Link>
      </section>

      {invoices.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-white/12 bg-white/[0.02] p-8 text-center">
          <h2 className="text-2xl font-semibold text-white">No invoices yet</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Create your first invoice to start issuing client-ready billing records for this workspace.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[2rem] border border-white/8 bg-white/[0.03]">
          <div className="grid grid-cols-[180px_minmax(0,1fr)_180px_180px] gap-4 border-b border-white/8 px-6 py-4 text-xs uppercase tracking-[0.24em] text-slate-400">
            <span>Invoice</span>
            <span>Client</span>
            <span>Due date</span>
            <span>Total</span>
          </div>

          <div className="divide-y divide-white/6">
            {invoices.map((invoice) => {
              return (
                <article
                  key={invoice.id}
                  className="grid grid-cols-1 gap-4 px-6 py-5 text-sm text-slate-200 md:grid-cols-[180px_minmax(0,1fr)_180px_180px]"
                >
                  <div>
                    <p className="font-medium text-white">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-slate-400">{invoice.status}</p>
                  </div>
                  <div>
                    <p>{invoice.client.fullName}</p>
                    <p className="mt-1 text-slate-400">{invoice.client.companyName ?? "Independent client"}</p>
                  </div>
                  <div>{formatDateOnly(invoice.dueAt)}</div>
                  <div className="font-medium text-white">{invoice.total.toLocaleString()} minor units</div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
