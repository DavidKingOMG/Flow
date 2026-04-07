import { beforeEach, describe, expect, it, vi } from "vitest";

const templateState = vi.hoisted(() => {
  const requireActiveBusiness = vi.fn();
  const clientFindFirst = vi.fn();
  const recurringInvoiceTemplateCreate = vi.fn();

  return {
    requireActiveBusiness,
    clientFindFirst,
    recurringInvoiceTemplateCreate,
  };
});

vi.mock("@/lib/business-context", () => ({
  assertBusinessAccess: vi.fn(),
  requireActiveBusiness: templateState.requireActiveBusiness,
}));

vi.mock("@/lib/db", () => ({
  db: {
    client: {
      findFirst: templateState.clientFindFirst,
    },
    recurringInvoiceTemplate: {
      create: templateState.recurringInvoiceTemplateCreate,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createRecurringTemplateAction,
  initialCreateRecurringTemplateFormState,
} from "@/server/actions/recurring-actions";

describe("createRecurringTemplateAction", () => {
  beforeEach(() => {
    templateState.requireActiveBusiness.mockReset();
    templateState.clientFindFirst.mockReset();
    templateState.recurringInvoiceTemplateCreate.mockReset();

    templateState.requireActiveBusiness.mockResolvedValue({
      userId: "user_manager_123",
      businessId: "business_123",
      activeBusinessId: "business_123",
      role: "MANAGER",
    });
    templateState.clientFindFirst.mockResolvedValue({
      id: "client_123",
    });
    templateState.recurringInvoiceTemplateCreate.mockImplementation(async ({ data }) => ({
      id: "template_123",
      ...data,
    }));
  });

  it("creates a business-scoped recurring template with normalized schedule data", async () => {
    const formData = new FormData();
    formData.set("name", "Monthly retainer");
    formData.set("clientId", "client_123");
    formData.set("frequency", "MONTHLY");
    formData.set("intervalCount", "1");
    formData.set("startsAt", "2026-06-01");
    formData.set("dueInDays", "7");
    formData.set("invoiceStatus", "SENT");
    formData.set("taxRateBps", "1000");
    formData.set("notes", "Generate on the first business day window.");
    formData.set(
      "lineItems",
      JSON.stringify([{ description: "Monthly retainer", quantity: 1, unitPrice: 120000 }]),
    );

    const result = await createRecurringTemplateAction(initialCreateRecurringTemplateFormState, formData);

    expect(templateState.clientFindFirst).toHaveBeenCalledWith({
      where: {
        id: "client_123",
        businessId: "business_123",
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    expect(templateState.recurringInvoiceTemplateCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
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
        notes: "Generate on the first business day window.",
        lineItems: {
          create: [
            {
              description: "Monthly retainer",
              quantity: 1,
              unitPrice: 120000,
              sortOrder: 0,
            },
          ],
        },
      }),
    });

    expect(result.status).toBe("success");
    expect(result.message).toMatch(/recurring template created/i);
  });

  it("rejects monthly schedules that start after the 28th to keep V1 generation predictable", async () => {
    const formData = new FormData();
    formData.set("name", "Month-end retainer");
    formData.set("clientId", "client_123");
    formData.set("frequency", "MONTHLY");
    formData.set("intervalCount", "1");
    formData.set("startsAt", "2026-01-31");
    formData.set("dueInDays", "7");
    formData.set("invoiceStatus", "DRAFT");
    formData.set("taxRateBps", "0");
    formData.set(
      "lineItems",
      JSON.stringify([{ description: "Monthly retainer", quantity: 1, unitPrice: 120000 }]),
    );

    const result = await createRecurringTemplateAction(initialCreateRecurringTemplateFormState, formData);

    expect(templateState.requireActiveBusiness).not.toHaveBeenCalled();
    expect(templateState.clientFindFirst).not.toHaveBeenCalled();
    expect(templateState.recurringInvoiceTemplateCreate).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.fieldErrors.startsAt?.[0]).toMatch(/28th/i);
  });

  it("rejects recurring invoice statuses outside the explicit draft or sent set", async () => {
    const formData = new FormData();
    formData.set("name", "Status mismatch");
    formData.set("clientId", "client_123");
    formData.set("frequency", "MONTHLY");
    formData.set("intervalCount", "1");
    formData.set("startsAt", "2026-06-01");
    formData.set("dueInDays", "7");
    formData.set("invoiceStatus", "PAID");
    formData.set("taxRateBps", "0");
    formData.set(
      "lineItems",
      JSON.stringify([{ description: "Monthly retainer", quantity: 1, unitPrice: 120000 }]),
    );

    const result = await createRecurringTemplateAction(initialCreateRecurringTemplateFormState, formData);

    expect(templateState.requireActiveBusiness).not.toHaveBeenCalled();
    expect(templateState.clientFindFirst).not.toHaveBeenCalled();
    expect(templateState.recurringInvoiceTemplateCreate).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.fieldErrors.invoiceStatus?.[0]).toMatch(/invalid option/i);
  });
});
