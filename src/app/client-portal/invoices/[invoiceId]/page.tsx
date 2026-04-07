import { notFound, redirect } from "next/navigation";
import { requireActiveBusiness } from "@/lib/business-context";
import { db } from "@/lib/db";
import { formatDateOnly } from "@/lib/invoices/date-only";
import { canViewClientPortalInvoice } from "@/lib/permissions";

async function getPortalInvoice(invoiceId: string) {
  const context = await requireActiveBusiness();

  if (!canViewClientPortalInvoice(context.role)) {
    redirect("/sign-in");
  }

  if (context.role === "CLIENT") {
    const client = await db.client.findFirst({
      where: {
        businessId: context.businessId,
        userId: context.userId,
      },
      select: {
        id: true,
      },
    });

    if (!client) {
      notFound();
    }

    const invoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        businessId: context.businessId,
        clientId: client.id,
      },
      select: {
        invoiceNumber: true,
        status: true,
        issuedAt: true,
        dueAt: true,
        subtotal: true,
        tax: true,
        total: true,
        paidAmount: true,
        notes: true,
        lineItems: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            description: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
      },
    });

    if (!invoice) {
      notFound();
    }

    return invoice;
  }

  const invoice = await db.invoice.findFirst({
    where: {
      id: invoiceId,
      businessId: context.businessId,
    },
    select: {
      invoiceNumber: true,
      status: true,
      issuedAt: true,
      dueAt: true,
      subtotal: true,
      tax: true,
      total: true,
      paidAmount: true,
      notes: true,
      lineItems: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          description: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  return invoice;
}

export default async function ClientPortalInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const invoice = await getPortalInvoice(invoiceId);
  const remaining = Math.max(invoice.total - invoice.paidAmount, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10 sm:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Client invoice portal</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">{invoice.invoiceNumber}</h1>
        <p className="mt-2 text-sm text-slate-300">Status: {invoice.status}</p>

        <div className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          <p>Issued: {formatDateOnly(invoice.issuedAt)}</p>
          <p>Due: {formatDateOnly(invoice.dueAt)}</p>
          <p>Subtotal: {invoice.subtotal.toLocaleString()} minor units</p>
          <p>Tax: {invoice.tax.toLocaleString()} minor units</p>
          <p>Total: {invoice.total.toLocaleString()} minor units</p>
          <p>Remaining: {remaining.toLocaleString()} minor units</p>
        </div>

        <section className="mt-8 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
          <h2 className="text-xl font-semibold text-white">Line items</h2>
          <div className="mt-4 space-y-3">
            {invoice.lineItems.map((item, index) => (
              <article key={`${item.description}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-white">{item.description}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {item.quantity} x {item.unitPrice.toLocaleString()} = {item.lineTotal.toLocaleString()} minor units
                </p>
              </article>
            ))}
          </div>
        </section>

        {invoice.notes ? (
          <section className="mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold text-white">Notes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{invoice.notes}</p>
          </section>
        ) : null}
      </section>
    </main>
  );
}
