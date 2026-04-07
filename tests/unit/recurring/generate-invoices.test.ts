import { beforeEach, describe, expect, it, vi } from "vitest";

const recurringState = vi.hoisted(() => {
  const recurringTemplateFindMany = vi.fn();
  const recurringTemplateUpdate = vi.fn();
  const recurringInvoiceGenerationCreate = vi.fn();
  const invoiceFindFirst = vi.fn();
  const createInvoiceForBusiness = vi.fn();

  return {
    recurringTemplateFindMany,
    recurringTemplateUpdate,
    recurringInvoiceGenerationCreate,
    invoiceFindFirst,
    createInvoiceForBusiness,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    recurringInvoiceTemplate: {
      findMany: recurringState.recurringTemplateFindMany,
      update: recurringState.recurringTemplateUpdate,
    },
    recurringInvoiceGeneration: {
      create: recurringState.recurringInvoiceGenerationCreate,
    },
    invoice: {
      findFirst: recurringState.invoiceFindFirst,
    },
  },
}));

vi.mock("@/server/actions/invoice-actions", () => ({
  createInvoiceForBusiness: recurringState.createInvoiceForBusiness,
}));

import { generateInvoicesFromTemplates } from "@/lib/recurring/generate-invoices";

describe("generateInvoicesFromTemplates", () => {
  beforeEach(() => {
    recurringState.recurringTemplateFindMany.mockReset();
    recurringState.recurringTemplateUpdate.mockReset();
    recurringState.recurringInvoiceGenerationCreate.mockReset();
    recurringState.invoiceFindFirst.mockReset();
    recurringState.createInvoiceForBusiness.mockReset();
  });

  it("creates an invoice when a recurring template is due and advances the next run date", async () => {
    recurringState.recurringTemplateFindMany.mockResolvedValue([
      {
        id: "template_123",
        businessId: "business_123",
        clientId: "client_123",
        name: "Monthly retainer",
        status: "ACTIVE",
        frequency: "MONTHLY",
        intervalCount: 1,
        dayOfMonth: 1,
        dayOfWeek: null,
        nextRunAt: new Date(2026, 5, 1, 12, 0, 0, 0),
        dueInDays: 7,
        invoiceStatus: "SENT",
        taxRateBps: 1000,
        notes: "Auto-generated monthly retainer",
        lineItems: [
          {
            description: "Retainer",
            quantity: 1,
            unitPrice: 120000,
            sortOrder: 0,
          },
        ],
      },
    ]);
    recurringState.invoiceFindFirst.mockResolvedValue(null);
    recurringState.createInvoiceForBusiness.mockResolvedValue({
      invoice: {
        id: "invoice_123",
        invoiceNumber: "INV-000042",
      },
      invoiceNumber: "INV-000042",
    });

    const result = await generateInvoicesFromTemplates({
      runAt: new Date(2026, 5, 1, 12, 0, 0, 0),
    });

    expect(recurringState.recurringTemplateFindMany).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
        nextRunAt: {
          lte: new Date(2026, 5, 1, 12, 0, 0, 0),
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

    expect(recurringState.createInvoiceForBusiness).toHaveBeenCalledWith(
      {
        userId: "system:recurring",
        businessId: "business_123",
        activeBusinessId: "business_123",
        role: "MANAGER",
      },
      expect.objectContaining({
        clientId: "client_123",
        status: "SENT",
        taxRateBps: 1000,
        recurringTemplateId: "template_123",
        recurringWindowStart: new Date(2026, 5, 1, 12, 0, 0, 0),
      }),
    );

    expect(recurringState.recurringTemplateUpdate).toHaveBeenCalledWith({
      where: {
        id: "template_123",
      },
      data: {
        lastRunAt: new Date(2026, 5, 1, 12, 0, 0, 0),
        lastGeneratedAt: new Date(2026, 5, 1, 12, 0, 0, 0),
        lastGeneratedInvoiceId: "invoice_123",
        nextRunAt: new Date(2026, 6, 1, 12, 0, 0, 0),
      },
    });

    expect(recurringState.recurringInvoiceGenerationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        templateId: "template_123",
        businessId: "business_123",
        scheduledFor: new Date(2026, 5, 1, 12, 0, 0, 0),
        outcome: "CREATED",
        invoiceId: "invoice_123",
        message: "Created invoice INV-000042.",
      }),
    });

    expect(result.createdCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });

  it("skips duplicate generation when the scheduled invoice already exists for the run window", async () => {
    recurringState.recurringTemplateFindMany.mockResolvedValue([
      {
        id: "template_123",
        businessId: "business_123",
        clientId: "client_123",
        name: "Weekly support",
        status: "ACTIVE",
        frequency: "WEEKLY",
        intervalCount: 1,
        dayOfMonth: null,
        dayOfWeek: 1,
        nextRunAt: new Date(2026, 3, 6, 12, 0, 0, 0),
        dueInDays: 3,
        invoiceStatus: "DRAFT",
        taxRateBps: 0,
        notes: null,
        lineItems: [
          {
            description: "Support retainer",
            quantity: 1,
            unitPrice: 30000,
            sortOrder: 0,
          },
        ],
      },
    ]);
    recurringState.invoiceFindFirst.mockResolvedValue({
      id: "invoice_existing",
      invoiceNumber: "INV-000099",
    });

    const result = await generateInvoicesFromTemplates({
      runAt: new Date(2026, 3, 6, 12, 0, 0, 0),
    });

    expect(recurringState.createInvoiceForBusiness).not.toHaveBeenCalled();
    expect(recurringState.recurringTemplateUpdate).toHaveBeenCalledWith({
      where: {
        id: "template_123",
      },
      data: {
        lastRunAt: new Date(2026, 3, 6, 12, 0, 0, 0),
        lastGeneratedAt: new Date(2026, 3, 6, 12, 0, 0, 0),
        lastGeneratedInvoiceId: "invoice_existing",
        nextRunAt: new Date(2026, 3, 13, 12, 0, 0, 0),
      },
    });
    expect(recurringState.recurringInvoiceGenerationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        templateId: "template_123",
        outcome: "SKIPPED",
        invoiceId: "invoice_existing",
        message: "Skipped because invoice INV-000099 already exists for this schedule.",
      }),
    });
    expect(result.createdCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.failedCount).toBe(0);
  });

  it("still generates the last valid occurrence when the job runs after the template end date", async () => {
    recurringState.recurringTemplateFindMany.mockResolvedValue([
      {
        id: "template_delayed",
        businessId: "business_123",
        clientId: "client_123",
        name: "Monthly advisory",
        status: "ACTIVE",
        frequency: "MONTHLY",
        intervalCount: 1,
        dayOfMonth: 1,
        dayOfWeek: null,
        nextRunAt: new Date(2026, 3, 1, 12, 0, 0, 0),
        endsAt: new Date(2026, 3, 10, 12, 0, 0, 0),
        dueInDays: 5,
        invoiceStatus: "SENT",
        taxRateBps: 0,
        notes: "Delayed job should still produce April's invoice.",
        lineItems: [
          {
            description: "Advisory retainer",
            quantity: 1,
            unitPrice: 90000,
            sortOrder: 0,
          },
        ],
      },
    ]);
    recurringState.invoiceFindFirst.mockResolvedValue(null);
    recurringState.createInvoiceForBusiness.mockResolvedValue({
      invoice: {
        id: "invoice_delayed",
        invoiceNumber: "INV-000050",
      },
      invoiceNumber: "INV-000050",
    });

    const result = await generateInvoicesFromTemplates({
      runAt: new Date(2026, 3, 20, 12, 0, 0, 0),
    });

    expect(recurringState.createInvoiceForBusiness).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        recurringTemplateId: "template_delayed",
        recurringWindowStart: new Date(2026, 3, 1, 12, 0, 0, 0),
      }),
    );
    expect(result.createdCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });

  it("treats a duplicate-run race as an idempotent skip instead of a failure", async () => {
    const duplicateError = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: {
        target: ["recurringTemplateId", "recurringWindowStart"],
      },
    });

    recurringState.recurringTemplateFindMany.mockResolvedValue([
      {
        id: "template_race",
        businessId: "business_123",
        clientId: "client_123",
        name: "Weekly support",
        status: "ACTIVE",
        frequency: "WEEKLY",
        intervalCount: 1,
        dayOfMonth: null,
        dayOfWeek: 1,
        nextRunAt: new Date(2026, 3, 6, 12, 0, 0, 0),
        endsAt: null,
        dueInDays: 3,
        invoiceStatus: "DRAFT",
        taxRateBps: 0,
        notes: null,
        lineItems: [
          {
            description: "Support retainer",
            quantity: 1,
            unitPrice: 30000,
            sortOrder: 0,
          },
        ],
      },
    ]);
    recurringState.invoiceFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "invoice_after_race",
        invoiceNumber: "INV-000105",
      });
    recurringState.createInvoiceForBusiness.mockRejectedValue(duplicateError);

    const result = await generateInvoicesFromTemplates({
      runAt: new Date(2026, 3, 6, 12, 0, 0, 0),
    });

    expect(recurringState.recurringInvoiceGenerationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        templateId: "template_race",
        outcome: "SKIPPED",
        invoiceId: "invoice_after_race",
        message: "Skipped because invoice INV-000105 already exists for this schedule.",
      }),
    });
    expect(result.createdCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.failedCount).toBe(0);
  });
});
