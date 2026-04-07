import { beforeEach, describe, expect, it, vi } from "vitest";

const invoiceState = vi.hoisted(() => {
  const requireActiveBusiness = vi.fn();
  const businessSettingsUpdate = vi.fn();
  const clientFindFirst = vi.fn();
  const recurringTemplateFindFirst = vi.fn();
  const invoiceCreate = vi.fn();
  const transaction = vi.fn();

  return {
    requireActiveBusiness,
    businessSettingsUpdate,
    clientFindFirst,
    recurringTemplateFindFirst,
    invoiceCreate,
    transaction,
  };
});

vi.mock("@/lib/business-context", () => ({
  assertBusinessAccess: vi.fn(),
  requireActiveBusiness: invoiceState.requireActiveBusiness,
}));

vi.mock("@/lib/db", () => ({
  db: {
    client: {
      findFirst: invoiceState.clientFindFirst,
    },
    recurringInvoiceTemplate: {
      findFirst: invoiceState.recurringTemplateFindFirst,
    },
    $transaction: invoiceState.transaction,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createInvoiceForBusiness,
  createInvoiceAction,
  initialCreateInvoiceFormState,
} from "@/server/actions/invoice-actions";

describe("createInvoiceAction", () => {
  beforeEach(() => {
    invoiceState.requireActiveBusiness.mockReset();
    invoiceState.businessSettingsUpdate.mockReset();
    invoiceState.clientFindFirst.mockReset();
    invoiceState.recurringTemplateFindFirst.mockReset();
    invoiceState.invoiceCreate.mockReset();
    invoiceState.transaction.mockReset();

    invoiceState.requireActiveBusiness.mockResolvedValue({
      userId: "user_admin_123",
      businessId: "business_123",
      activeBusinessId: "business_123",
      role: "ADMIN",
    });
    invoiceState.clientFindFirst.mockResolvedValue({
      id: "client_123",
      businessId: "business_123",
      fullName: "Northwind Studio",
    });
    invoiceState.recurringTemplateFindFirst.mockResolvedValue({
      id: "template_123",
      businessId: "business_123",
      clientId: "client_123",
    });
    invoiceState.businessSettingsUpdate.mockResolvedValue({
      id: "settings_123",
      businessId: "business_123",
      nextInvoiceNumber: 8,
    });
    invoiceState.invoiceCreate.mockImplementation(async ({ data }) => ({
      id: "invoice_123",
      businessId: data.businessId,
      clientId: data.clientId,
      invoiceNumber: data.invoiceNumber,
      status: data.status,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      notes: data.notes ?? null,
      lineItems: data.lineItems.create,
    }));
    invoiceState.transaction.mockImplementation(async (callback) =>
      callback({
        businessSettings: {
          update: invoiceState.businessSettingsUpdate,
        },
        invoice: {
          create: invoiceState.invoiceCreate,
        },
      }),
    );
  });

  it("creates a business-scoped invoice with generated numbering and persisted line items", async () => {
    const formData = new FormData();
    formData.set("clientId", "client_123");
    formData.set("issuedAt", "2026-04-04");
    formData.set("dueAt", "2026-04-18");
    formData.set("status", "SENT");
    formData.set("taxRateBps", "1000");
    formData.set("notes", "Net 14 terms.");
    formData.set(
      "lineItems",
      JSON.stringify([
        { description: "Website redesign", quantity: 2, unitPrice: 15000 },
        { description: "QA pass", quantity: 1, unitPrice: 5000 },
      ]),
    );

    const result = await createInvoiceAction(initialCreateInvoiceFormState, formData);

    expect(invoiceState.clientFindFirst).toHaveBeenCalledWith({
      where: {
        id: "client_123",
        businessId: "business_123",
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    expect(invoiceState.businessSettingsUpdate).toHaveBeenCalledWith({
      where: {
        businessId: "business_123",
      },
      data: {
        nextInvoiceNumber: {
          increment: 1,
        },
      },
      select: {
        nextInvoiceNumber: true,
      },
    });

    expect(invoiceState.invoiceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: "business_123",
        clientId: "client_123",
        invoiceNumber: "INV-000007",
        status: "SENT",
        subtotal: 35000,
        tax: 3500,
        total: 38500,
        lineItems: {
          create: [
            {
              description: "Website redesign",
              quantity: 2,
              unitPrice: 15000,
              lineTotal: 30000,
              sortOrder: 0,
            },
            {
              description: "QA pass",
              quantity: 1,
              unitPrice: 5000,
              lineTotal: 5000,
              sortOrder: 1,
            },
          ],
        },
      }),
    });

    const createdInvoiceData = invoiceState.invoiceCreate.mock.calls[0][0].data;
    expect(createdInvoiceData.issuedAt).toEqual(new Date(2026, 3, 4, 12, 0, 0, 0));
    expect(createdInvoiceData.dueAt).toEqual(new Date(2026, 3, 18, 12, 0, 0, 0));

    expect(result.status).toBe("success");
    expect(result.message).toMatch(/invoice created/i);
  });

  it("rejects inactive or missing clients before opening the invoice transaction", async () => {
    invoiceState.clientFindFirst.mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.set("clientId", "client_inactive");
    formData.set("issuedAt", "2026-04-04");
    formData.set("dueAt", "2026-04-18");
    formData.set("status", "SENT");
    formData.set("taxRateBps", "0");
    formData.set(
      "lineItems",
      JSON.stringify([{ description: "Monthly retainer", quantity: 1, unitPrice: 15000 }]),
    );

    const result = await createInvoiceAction(initialCreateInvoiceFormState, formData);

    expect(invoiceState.clientFindFirst).toHaveBeenCalledWith({
      where: {
        id: "client_inactive",
        businessId: "business_123",
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });
    expect(invoiceState.transaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.fieldErrors.clientId?.[0]).toMatch(/active business/i);
  });

  it("rejects impossible calendar dates before business lookups or writes", async () => {
    const formData = new FormData();
    formData.set("clientId", "client_123");
    formData.set("issuedAt", "2026-02-31");
    formData.set("dueAt", "2026-03-05");
    formData.set("status", "SENT");
    formData.set("taxRateBps", "0");
    formData.set(
      "lineItems",
      JSON.stringify([{ description: "Monthly retainer", quantity: 1, unitPrice: 15000 }]),
    );

    const result = await createInvoiceAction(initialCreateInvoiceFormState, formData);

    expect(invoiceState.requireActiveBusiness).not.toHaveBeenCalled();
    expect(invoiceState.clientFindFirst).not.toHaveBeenCalled();
    expect(invoiceState.transaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.fieldErrors.issuedAt?.[0]).toMatch(/yyyy-mm-dd/i);
  });

  it("rejects billing actions for users below manager access", async () => {
    invoiceState.requireActiveBusiness.mockResolvedValueOnce({
      userId: "user_staff_123",
      businessId: "business_123",
      activeBusinessId: "business_123",
      role: "STAFF",
    });

    const formData = new FormData();
    formData.set("clientId", "client_123");
    formData.set("issuedAt", "2026-04-04");
    formData.set("dueAt", "2026-04-18");
    formData.set("status", "SENT");
    formData.set("taxRateBps", "0");
    formData.set(
      "lineItems",
      JSON.stringify([{ description: "Monthly retainer", quantity: 1, unitPrice: 15000 }]),
    );

    const result = await createInvoiceAction(initialCreateInvoiceFormState, formData);

    expect(invoiceState.clientFindFirst).not.toHaveBeenCalled();
    expect(invoiceState.transaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/manager/i);
  });

  it("rejects recurring template links from another business before the invoice transaction opens", async () => {
    invoiceState.recurringTemplateFindFirst.mockResolvedValueOnce(null);

    await expect(
      createInvoiceForBusiness(
        {
          userId: "user_admin_123",
          businessId: "business_123",
          activeBusinessId: "business_123",
          role: "ADMIN",
        },
        {
          clientId: "client_123",
          issuedAt: new Date(2026, 3, 4, 12, 0, 0, 0),
          dueAt: new Date(2026, 3, 18, 12, 0, 0, 0),
          status: "SENT",
          taxRateBps: 0,
          lineItems: [{ description: "Monthly retainer", quantity: 1, unitPrice: 15000 }],
          recurringTemplateId: "template_other_business",
          recurringWindowStart: new Date(2026, 3, 4, 12, 0, 0, 0),
        },
      ),
    ).rejects.toThrow(/same business/i);

    expect(invoiceState.recurringTemplateFindFirst).toHaveBeenCalledWith({
      where: {
        id: "template_other_business",
        businessId: "business_123",
        clientId: "client_123",
      },
      select: {
        id: true,
      },
    });
    expect(invoiceState.transaction).not.toHaveBeenCalled();
  });
});
