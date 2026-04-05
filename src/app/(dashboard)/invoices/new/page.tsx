import Link from "next/link";
import { redirect } from "next/navigation";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { requireActiveBusiness } from "@/lib/business-context";
import { db } from "@/lib/db";
import { assertBillingAccess, BillingAccessError } from "@/lib/invoices/authorization";

async function getInvoiceClients() {
  const context = await requireActiveBusiness();
  assertBillingAccess(context);

  return db.client.findMany({
    where: {
      businessId: context.businessId,
      status: "ACTIVE",
    },
    orderBy: [{ fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      companyName: true,
    },
  });
}

export default async function NewInvoicePage() {
  let clients;

  try {
    clients = await getInvoiceClients();
  } catch (error) {
    if (error instanceof BillingAccessError) {
      redirect("/dashboard");
    }

    throw error;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(14,23,38,0.96),rgba(8,11,20,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.36em] text-cyan-300/75">Billing workflow</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Create invoice</h1>
          <p className="mt-4 text-base leading-7 text-[hsl(var(--dashboard-muted))]">
            Generate a numbered invoice with line items, due dates, and V1 invoice statuses for active clients.
          </p>
        </div>
      </section>

      {clients.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-white/12 bg-white/[0.02] p-8">
          <h2 className="text-2xl font-semibold text-white">Add a client first</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Invoice creation stays business-scoped, so you need an active client record before issuing billing.
          </p>
          <Link
            href="/clients/new"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200"
          >
            Add client
          </Link>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
          <InvoiceForm clients={clients} />
        </section>
      )}
    </div>
  );
}
