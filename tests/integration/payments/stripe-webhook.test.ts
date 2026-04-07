import { beforeEach, describe, expect, it, vi } from "vitest";

const webhookState = vi.hoisted(() => {
  const verifyStripeWebhookEvent = vi.fn();
  const transaction = vi.fn();
  const invoiceFindFirst = vi.fn();
  const paymentCreate = vi.fn();
  const invoiceUpdate = vi.fn();

  return {
    verifyStripeWebhookEvent,
    transaction,
    invoiceFindFirst,
    paymentCreate,
    invoiceUpdate,
  };
});

vi.mock("@/lib/payments/stripe", () => ({
  verifyStripeWebhookEvent: webhookState.verifyStripeWebhookEvent,
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: webhookState.transaction,
  },
}));

import { POST } from "@/app/api/stripe/webhook/route";

describe("stripe webhook route", () => {
  beforeEach(() => {
    webhookState.verifyStripeWebhookEvent.mockReset();
    webhookState.transaction.mockReset();
    webhookState.invoiceFindFirst.mockReset();
    webhookState.paymentCreate.mockReset();
    webhookState.invoiceUpdate.mockReset();

    webhookState.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        invoice: {
          findFirst: webhookState.invoiceFindFirst,
          update: webhookState.invoiceUpdate,
        },
        payment: {
          create: webhookState.paymentCreate,
        },
      }),
    );
    webhookState.invoiceFindFirst.mockResolvedValue({
      id: "invoice_123",
      status: "SENT",
      dueAt: new Date(2026, 5, 20, 12, 0, 0, 0),
      total: 50000,
      paidAmount: 10000,
    });
    webhookState.paymentCreate.mockResolvedValue({ id: "payment_123" });
    webhookState.invoiceUpdate.mockResolvedValue({ id: "invoice_123" });
  });

  it("verifies the webhook and records a Stripe payment for checkout completion", async () => {
    webhookState.verifyStripeWebhookEvent.mockReturnValue({
      id: "evt_123",
      type: "checkout.session.completed",
      created: 1770619200,
      data: {
        object: {
          id: "cs_test_123",
          amount_total: 20000,
          payment_intent: "pi_123",
          metadata: {
            businessId: "business_123",
            invoiceId: "invoice_123",
          },
        },
      },
    });

    const request = new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "test-signature",
      },
      body: JSON.stringify({ example: true }),
    });

    const response = await POST(request);

    expect(webhookState.verifyStripeWebhookEvent).toHaveBeenCalledWith(
      JSON.stringify({ example: true }),
      "test-signature",
    );

    expect(webhookState.paymentCreate).toHaveBeenCalledWith({
      data: {
        businessId: "business_123",
        invoiceId: "invoice_123",
        amount: 20000,
        method: "STRIPE_CHECKOUT",
        source: "STRIPE",
        stripePaymentIntentId: "pi_123",
        stripeCheckoutSessionId: "cs_test_123",
        stripeEventId: "evt_123",
        recordedAt: new Date(1770619200 * 1000),
      },
    });

    expect(webhookState.invoiceUpdate).toHaveBeenCalledWith({
      where: {
        id: "invoice_123",
      },
      data: {
        paidAmount: 30000,
        status: "PARTIAL",
      },
    });

    expect(response.status).toBe(200);
  });

  it("rejects requests with invalid signatures", async () => {
    webhookState.verifyStripeWebhookEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const request = new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "bad-signature",
      },
      body: "{}",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(webhookState.paymentCreate).not.toHaveBeenCalled();
    expect(webhookState.invoiceUpdate).not.toHaveBeenCalled();
  });

  it("is idempotent when the same Stripe event is retried", async () => {
    const duplicateError = {
      code: "P2002",
    };

    webhookState.verifyStripeWebhookEvent.mockReturnValue({
      id: "evt_duplicate",
      type: "checkout.session.completed",
      created: 1770619200,
      data: {
        object: {
          id: "cs_test_123",
          amount_total: 20000,
          payment_intent: "pi_123",
          metadata: {
            businessId: "business_123",
            invoiceId: "invoice_123",
          },
        },
      },
    });
    webhookState.paymentCreate.mockRejectedValueOnce(duplicateError);

    const request = new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "test-signature",
      },
      body: "{}",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
