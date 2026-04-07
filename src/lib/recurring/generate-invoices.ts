import { Prisma } from "@prisma/client";
import { writeActivityLog } from "@/lib/activity-log";
import { db } from "@/lib/db";
import { createInvoiceForBusiness } from "@/server/actions/invoice-actions";
import { calculateDueDate, calculateNextRunAt } from "@/lib/recurring/schedule";

type GenerateInvoicesOptions = {
  runAt?: Date;
};

type GenerateInvoicesResult = {
  createdCount: number;
  skippedCount: number;
  failedCount: number;
};

async function findExistingScheduledInvoice(templateId: string, businessId: string, scheduledFor: Date) {
  return db.invoice.findFirst({
    where: {
      businessId,
      recurringTemplateId: templateId,
      recurringWindowStart: scheduledFor,
    },
    select: {
      id: true,
      invoiceNumber: true,
    },
  });
}

function shouldGenerateScheduledOccurrence(endsAt: Date | null, scheduledFor: Date) {
  return !endsAt || endsAt.getTime() >= scheduledFor.getTime();
}

function isRecurringDuplicateRace(error: unknown) {
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : null;

  if (code !== "P2002") {
    return false;
  }

  const meta =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.meta
      : typeof error === "object" && error !== null && "meta" in error
        ? (error.meta as { target?: unknown })
        : undefined;
  const target = Array.isArray(meta?.target) ? meta.target.map(String) : [];

  return target.includes("recurringTemplateId") && target.includes("recurringWindowStart");
}

export async function generateInvoicesFromTemplates({
  runAt = new Date(),
}: GenerateInvoicesOptions = {}): Promise<GenerateInvoicesResult> {
  const templates = await db.recurringInvoiceTemplate.findMany({
    where: {
      status: "ACTIVE",
      nextRunAt: {
        lte: runAt,
      },
    },
    include: {
      lineItems: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
    orderBy: {
      nextRunAt: "asc",
    },
  });

  let createdCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const template of templates) {
    const scheduledFor = template.nextRunAt;

    if (!shouldGenerateScheduledOccurrence(template.endsAt, scheduledFor)) {
      continue;
    }

    const nextRunAt = calculateNextRunAt({
      frequency: template.frequency,
      intervalCount: template.intervalCount,
      scheduledFor,
      dayOfWeek: template.dayOfWeek,
      dayOfMonth: template.dayOfMonth,
    });

    const existingInvoice = await findExistingScheduledInvoice(template.id, template.businessId, scheduledFor);

    if (existingInvoice) {
      skippedCount += 1;

      await db.recurringInvoiceTemplate.update({
        where: {
          id: template.id,
        },
        data: {
          lastRunAt: runAt,
          lastGeneratedAt: runAt,
          lastGeneratedInvoiceId: existingInvoice.id,
          nextRunAt,
        },
      });

      await db.recurringInvoiceGeneration.create({
        data: {
          templateId: template.id,
          businessId: template.businessId,
          scheduledFor,
          runAt,
          outcome: "SKIPPED",
          invoiceId: existingInvoice.id,
          message: `Skipped because invoice ${existingInvoice.invoiceNumber} already exists for this schedule.`,
        },
      });

      await writeActivityLog({
        businessId: template.businessId,
        type: "RECURRING_INVOICE_GENERATED",
        title: "Recurring run skipped",
        message: `Skipped template ${template.name}; invoice ${existingInvoice.invoiceNumber} already exists.`,
        metadata: {
          templateId: template.id,
          invoiceId: existingInvoice.id,
          scheduledFor,
        },
      });

      continue;
    }

    try {
      const created = await createInvoiceForBusiness(
        {
          userId: "system:recurring",
          businessId: template.businessId,
          activeBusinessId: template.businessId,
          role: "MANAGER",
        },
        {
          clientId: template.clientId,
          issuedAt: scheduledFor,
          dueAt: calculateDueDate(scheduledFor, template.dueInDays),
          status: template.invoiceStatus === "SENT" ? "SENT" : "DRAFT",
          taxRateBps: template.taxRateBps,
          notes: template.notes ?? undefined,
          lineItems: template.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          recurringTemplateId: template.id,
          recurringWindowStart: scheduledFor,
        },
      );

      createdCount += 1;

      await db.recurringInvoiceTemplate.update({
        where: {
          id: template.id,
        },
        data: {
          lastRunAt: runAt,
          lastGeneratedAt: runAt,
          lastGeneratedInvoiceId: created.invoice.id,
          nextRunAt,
        },
      });

      await db.recurringInvoiceGeneration.create({
        data: {
          templateId: template.id,
          businessId: template.businessId,
          scheduledFor,
          runAt,
          outcome: "CREATED",
          invoiceId: created.invoice.id,
          message: `Created invoice ${created.invoiceNumber}.`,
        },
      });

      await writeActivityLog({
        businessId: template.businessId,
        type: "RECURRING_INVOICE_GENERATED",
        title: "Recurring invoice generated",
        message: `Generated ${created.invoiceNumber} from template ${template.name}.`,
        metadata: {
          templateId: template.id,
          invoiceId: created.invoice.id,
          scheduledFor,
        },
      });
    } catch (error) {
      if (isRecurringDuplicateRace(error)) {
        const invoiceCreatedByConcurrentRun = await findExistingScheduledInvoice(
          template.id,
          template.businessId,
          scheduledFor,
        );

        if (invoiceCreatedByConcurrentRun) {
          skippedCount += 1;

          await db.recurringInvoiceTemplate.update({
            where: {
              id: template.id,
            },
            data: {
              lastRunAt: runAt,
              lastGeneratedAt: runAt,
              lastGeneratedInvoiceId: invoiceCreatedByConcurrentRun.id,
              nextRunAt,
            },
          });

          await db.recurringInvoiceGeneration.create({
            data: {
              templateId: template.id,
              businessId: template.businessId,
              scheduledFor,
              runAt,
              outcome: "SKIPPED",
              invoiceId: invoiceCreatedByConcurrentRun.id,
              message: `Skipped because invoice ${invoiceCreatedByConcurrentRun.invoiceNumber} already exists for this schedule.`,
            },
          });

          await writeActivityLog({
            businessId: template.businessId,
            type: "RECURRING_INVOICE_GENERATED",
            title: "Recurring run skipped",
            message: `Concurrent run already produced ${invoiceCreatedByConcurrentRun.invoiceNumber}.`,
            metadata: {
              templateId: template.id,
              invoiceId: invoiceCreatedByConcurrentRun.id,
              scheduledFor,
            },
          });

          continue;
        }
      }

      failedCount += 1;

      await db.recurringInvoiceTemplate.update({
        where: {
          id: template.id,
        },
        data: {
          lastRunAt: runAt,
        },
      });

      await db.recurringInvoiceGeneration.create({
        data: {
          templateId: template.id,
          businessId: template.businessId,
          scheduledFor,
          runAt,
          outcome: "FAILED",
          message: error instanceof Error ? error.message : "Recurring invoice generation failed.",
        },
      });

      await writeActivityLog({
        businessId: template.businessId,
        type: "RECURRING_INVOICE_GENERATED",
        title: "Recurring generation failed",
        message: error instanceof Error ? error.message : "Recurring invoice generation failed.",
        metadata: {
          templateId: template.id,
          scheduledFor,
          outcome: "FAILED",
        },
      });
    }
  }

  return {
    createdCount,
    skippedCount,
    failedCount,
  };
}
