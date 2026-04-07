import { redirect } from "next/navigation";
import { submitManualPaymentAction } from "@/server/actions/payment-actions";
import { requireActiveBusiness } from "@/lib/business-context";
import { db } from "@/lib/db";
import { formatDateOnly } from "@/lib/invoices/date-only";
import { assertBillingAccess, BillingAccessError } from "@/lib/invoices/authorization";

async function getPaymentsPageData() {
  const context = await requireActiveBusiness();
  assertBillingAccess(context);

  const [invoices, payments] = await Promise.all([
    db.invoice.findMany({
      where: {
        businessId: context.businessId,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 50,
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        paidAmount: true,
        client: {
          select: {
            fullName: true,
            companyName: true,
          },
        },
      },
    }),
    db.payment.findMany({
      where: {
        businessId: context.businessId,
      },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true,
        amount: true,
        method: true,
        source: true,
        recordedAt: true,
        invoice: {
          select: {
            invoiceNumber: true,
            client: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    invoices,
    payments,
  };
}

export default async function PaymentsPage() {
  let pageData;

  try {
    pageData = await getPaymentsPageData();
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
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Payments</h1>
          <p className="mt-4 text-base leading-7 text-[hsl(var(--dashboard-muted))]">
            Record manual settlements, review Stripe events, and keep invoice balances synchronized in one workflow.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
          <h2 className="text-2xl font-semibold text-white">Record manual payment</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Use this when money is collected offline (bank transfer, cash, or direct card capture).
          </p>

          <form action={submitManualPaymentAction} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-200">
              Invoice
              <select
                name="invoiceId"
                required
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
              >
                <option value="">Select invoice</option>
                {pageData.invoices.map((invoice) => {
                  const remaining = Math.max(invoice.total - invoice.paidAmount, 0);

                  return (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} - {invoice.client.fullName}
                      {invoice.client.companyName ? ` (${invoice.client.companyName})` : ""} - remaining {remaining}
                    </option>
                  );
                })}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm text-slate-200">
                Amount (minor units)
                <input
                  name="amount"
                  type="number"
                  min={1}
                  step={1}
                  required
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
                />
              </label>

              <label className="grid gap-2 text-sm text-slate-200">
                Method
                <select
                  name="method"
                  defaultValue="BANK_TRANSFER"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
                >
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card (offline)</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-slate-200">
                Recorded at
                <input
                  name="recordedAt"
                  type="date"
                  required
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-slate-200">
              Notes
              <textarea
                name="notes"
                rows={3}
                placeholder="Optional internal note"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-fit items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200"
            >
              Record payment
            </button>
          </form>
        </div>

        <section className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/70">Recent activity</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Payment history</h2>

          {pageData.payments.length === 0 ? (
            <p className="mt-6 text-sm leading-6 text-slate-400">
              No payments recorded yet. Manual and Stripe-confirmed payments will appear here.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {pageData.payments.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-[1.35rem] border border-white/8 bg-slate-950/25 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{payment.invoice.invoiceNumber}</p>
                    <span className="text-xs uppercase tracking-[0.24em] text-cyan-100">
                      {payment.source}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{payment.amount.toLocaleString()} minor units</p>
                  <p className="mt-1 text-sm text-slate-400">{payment.invoice.client.fullName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                    {payment.method} - {formatDateOnly(payment.recordedAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
