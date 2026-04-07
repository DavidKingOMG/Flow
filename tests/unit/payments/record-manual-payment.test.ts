import { beforeEach, describe, expect, it, vi } from "vitest";

const paymentState = vi.hoisted(() => {
  const invoiceFindFirst = vi.fn();
  const paymentCreate = vi.fn();
  const invoiceUpdate = vi.fn();
  const transaction = vi.fn();

  return {
    invoiceFindFirst,
    paymentCreate,
    invoiceUpdate,
    transaction,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: paymentState.transaction,
  },
}));

import {
  PaymentAmountExceedsBalanceError,
  PaymentInvoiceNotFoundError,
  recordManualPayment,
} from "@/lib/payments/record-manual-payment";

describe("recordManualPayment", () => {
  beforeEach(() => {
    paymentState.invoiceFindFirst.mockReset();
    paymentState.paymentCreate.mockReset();
    paymentState.invoiceUpdate.mockReset();
    paymentState.transaction.mockReset();

    paymentState.paymentCreate.mockResolvedValue({
      id: "payment_123",
    });
    paymentState.invoiceUpdate.mockResolvedValue({
      id: "invoice_123",
      businessId: "business_123",
      invoiceNumber: "INV-000012",
      status: "PARTIAL",
      total: 50000,
      paidAmount: 20000,
    });
    paymentState.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        invoice: {
          findFirst: paymentState.invoiceFindFirst,
          update: paymentState.invoiceUpdate,
        },
        payment: {
          create: paymentState.paymentCreate,
        },
      }),
    );
  });

  it("updates invoice paid amount and status after a manual payment", async () => {
    paymentState.invoiceFindFirst.mockResolvedValue({
      id: "invoice_123",
      businessId: "business_123",
      invoiceNumber: "INV-000012",
      status: "SENT",
      dueAt: new Date(2026, 5, 20, 12, 0, 0, 0),
      total: 50000,
      paidAmount: 5000,
    });

    const result = await recordManualPayment({
      businessId: "business_123",
      invoiceId: "invoice_123",
      amount: 15000,
      method: "BANK_TRANSFER",
      recordedAt: new Date(2026, 5, 10, 12, 0, 0, 0),
    });

    expect(paymentState.paymentCreate).toHaveBeenCalledWith({
      data: {
        businessId: "business_123",
        invoiceId: "invoice_123",
        amount: 15000,
        method: "BANK_TRANSFER",
        source: "MANUAL",
        notes: null,
        recordedAt: new Date(2026, 5, 10, 12, 0, 0, 0),
      },
    });

    expect(paymentState.invoiceUpdate).toHaveBeenCalledWith({
      where: {
        id: "invoice_123",
      },
      data: {
        paidAmount: 20000,
        status: "PARTIAL",
      },
      select: {
        id: true,
        businessId: true,
        invoiceNumber: true,
        status: true,
        total: true,
        paidAmount: true,
      },
    });

    expect(result.invoice.status).toBe("PARTIAL");
    expect(result.invoice.paidAmount).toBe(20000);
  });

  it("rejects payments that exceed remaining balance", async () => {
    paymentState.invoiceFindFirst.mockResolvedValue({
      id: "invoice_123",
      businessId: "business_123",
      invoiceNumber: "INV-000012",
      status: "SENT",
      dueAt: new Date(2026, 5, 20, 12, 0, 0, 0),
      total: 50000,
      paidAmount: 49000,
    });

    await expect(
      recordManualPayment({
        businessId: "business_123",
        invoiceId: "invoice_123",
        amount: 1500,
        method: "CARD",
        recordedAt: new Date(2026, 5, 10, 12, 0, 0, 0),
      }),
    ).rejects.toBeInstanceOf(PaymentAmountExceedsBalanceError);

    expect(paymentState.paymentCreate).not.toHaveBeenCalled();
    expect(paymentState.invoiceUpdate).not.toHaveBeenCalled();
  });

  it("rejects invoice IDs that do not belong to the business", async () => {
    paymentState.invoiceFindFirst.mockResolvedValue(null);

    await expect(
      recordManualPayment({
        businessId: "business_123",
        invoiceId: "invoice_missing",
        amount: 1500,
        method: "CASH",
        recordedAt: new Date(2026, 5, 10, 12, 0, 0, 0),
      }),
    ).rejects.toBeInstanceOf(PaymentInvoiceNotFoundError);

    expect(paymentState.paymentCreate).not.toHaveBeenCalled();
    expect(paymentState.invoiceUpdate).not.toHaveBeenCalled();
  });
});
