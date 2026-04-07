import { beforeEach, describe, expect, it, vi } from "vitest";

const portalState = vi.hoisted(() => {
  const requireActiveBusiness = vi.fn();
  const redirect = vi.fn();
  const notFound = vi.fn();
  const clientFindFirst = vi.fn();
  const invoiceFindFirst = vi.fn();

  return {
    requireActiveBusiness,
    redirect,
    notFound,
    clientFindFirst,
    invoiceFindFirst,
  };
});

vi.mock("next/navigation", () => ({
  redirect: portalState.redirect,
  notFound: portalState.notFound,
}));

vi.mock("@/lib/business-context", () => ({
  requireActiveBusiness: portalState.requireActiveBusiness,
}));

vi.mock("@/lib/db", () => ({
  db: {
    client: {
      findFirst: portalState.clientFindFirst,
    },
    invoice: {
      findFirst: portalState.invoiceFindFirst,
    },
  },
}));

import ClientPortalInvoicePage from "@/app/client-portal/invoices/[invoiceId]/page";

describe("client portal invoice access", () => {
  beforeEach(() => {
    portalState.requireActiveBusiness.mockReset();
    portalState.redirect.mockReset();
    portalState.notFound.mockReset();
    portalState.clientFindFirst.mockReset();
    portalState.invoiceFindFirst.mockReset();

    portalState.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    portalState.notFound.mockImplementation(() => {
      throw new Error("not-found");
    });
  });

  it("allows a client to view their own invoice", async () => {
    portalState.requireActiveBusiness.mockResolvedValue({
      userId: "user_client_123",
      businessId: "business_123",
      activeBusinessId: "business_123",
      role: "CLIENT",
    });
    portalState.clientFindFirst.mockResolvedValue({
      id: "client_123",
    });
    portalState.invoiceFindFirst.mockResolvedValue({
      invoiceNumber: "INV-000100",
      status: "SENT",
      issuedAt: new Date(2026, 5, 1, 12, 0, 0, 0),
      dueAt: new Date(2026, 5, 10, 12, 0, 0, 0),
      subtotal: 50000,
      tax: 0,
      total: 50000,
      paidAmount: 0,
      notes: null,
      lineItems: [
        {
          description: "Retainer",
          quantity: 1,
          unitPrice: 50000,
          lineTotal: 50000,
        },
      ],
    });

    const page = await ClientPortalInvoicePage({
      params: Promise.resolve({ invoiceId: "invoice_123" }),
    });

    expect(page).toBeTruthy();
    expect(portalState.clientFindFirst).toHaveBeenCalledWith({
      where: {
        businessId: "business_123",
        userId: "user_client_123",
      },
      select: {
        id: true,
      },
    });
    expect(portalState.invoiceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "invoice_123",
          businessId: "business_123",
          clientId: "client_123",
        },
      }),
    );
  });

  it("rejects access when a client tries to open another client's invoice", async () => {
    portalState.requireActiveBusiness.mockResolvedValue({
      userId: "user_client_123",
      businessId: "business_123",
      activeBusinessId: "business_123",
      role: "CLIENT",
    });
    portalState.clientFindFirst.mockResolvedValue({
      id: "client_123",
    });
    portalState.invoiceFindFirst.mockResolvedValue(null);

    await expect(
      ClientPortalInvoicePage({
        params: Promise.resolve({ invoiceId: "invoice_other" }),
      }),
    ).rejects.toThrow("not-found");
  });
});
