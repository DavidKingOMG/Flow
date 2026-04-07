import { redirect } from "next/navigation";
import { RecurringTemplateForm } from "@/components/forms/recurring-template-form";
import { requireActiveBusiness } from "@/lib/business-context";
import { db } from "@/lib/db";
import { formatDateOnly } from "@/lib/invoices/date-only";
import { assertBillingAccess, BillingAccessError } from "@/lib/invoices/authorization";

async function getRecurringPageData() {
  const context = await requireActiveBusiness();
  assertBillingAccess(context);

  const [clients, templates, recentRuns] = await Promise.all([
    db.client.findMany({
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
    }),
    db.recurringInvoiceTemplate.findMany({
      where: {
        businessId: context.businessId,
      },
      orderBy: [{ nextRunAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        status: true,
        frequency: true,
        intervalCount: true,
        nextRunAt: true,
        dueInDays: true,
        invoiceStatus: true,
        client: {
          select: {
            fullName: true,
            companyName: true,
          },
        },
        lineItems: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            description: true,
          },
        },
      },
    }),
    db.recurringInvoiceGeneration.findMany({
      where: {
        businessId: context.businessId,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        outcome: true,
        scheduledFor: true,
        message: true,
        template: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return {
    clients,
    templates,
    recentRuns,
  };
}

function describeFrequency(frequency: "WEEKLY" | "MONTHLY", intervalCount: number) {
  if (frequency === "WEEKLY") {
    return intervalCount === 1 ? "Weekly" : `Every ${intervalCount} weeks`;
  }

  return intervalCount === 1 ? "Monthly" : `Every ${intervalCount} months`;
}

export default async function RecurringBillingPage() {
  let pageData;

  try {
    pageData = await getRecurringPageData();
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
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Recurring billing</h1>
          <p className="mt-4 text-base leading-7 text-[hsl(var(--dashboard-muted))]">
            Create predictable invoice templates, keep schedule anchors operator-visible, and review generation outcomes before they turn into revenue surprises.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
          {pageData.clients.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] p-6">
              <h2 className="text-2xl font-semibold text-white">Add a client before scheduling</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Recurring templates stay business-scoped, so they only attach to active clients in the current workspace.
              </p>
            </div>
          ) : (
            <RecurringTemplateForm clients={pageData.clients} />
          )}
        </div>

        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/70">Template queue</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Upcoming schedules</h2>
              </div>
              <div className="rounded-full border border-cyan-300/20 px-4 py-2 text-sm text-cyan-100">
                {pageData.templates.length} active records
              </div>
            </div>

            {pageData.templates.length === 0 ? (
              <p className="mt-6 text-sm leading-6 text-slate-400">
                No recurring templates yet. Create one to make next run dates and generation history visible here.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {pageData.templates.map((template) => (
                  <article
                    key={template.id}
                    className="rounded-[1.5rem] border border-white/8 bg-slate-950/25 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {template.client.fullName}
                          {template.client.companyName ? ` - ${template.client.companyName}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-100">
                        {template.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                      <p>{describeFrequency(template.frequency, template.intervalCount)}</p>
                      <p>Next run: {formatDateOnly(template.nextRunAt)}</p>
                      <p>Generated invoice status: {template.invoiceStatus}</p>
                      <p>Due in {template.dueInDays} day(s)</p>
                    </div>

                    {template.lineItems.length > 0 ? (
                      <p className="mt-4 text-sm text-slate-400">
                        Scope: {template.lineItems.map((item) => item.description).join(", ")}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/70">Run history</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Recent generation results</h2>

            {pageData.recentRuns.length === 0 ? (
              <p className="mt-6 text-sm leading-6 text-slate-400">
                No recurring runs have been recorded yet. Once generation jobs execute, outcomes will surface here.
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                {pageData.recentRuns.map((run) => (
                  <article
                    key={run.id}
                    className="rounded-[1.35rem] border border-white/8 bg-slate-950/25 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{run.template.name}</p>
                      <span className="text-xs uppercase tracking-[0.24em] text-cyan-100">{run.outcome}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{run.message}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                      Scheduled for {formatDateOnly(run.scheduledFor)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
