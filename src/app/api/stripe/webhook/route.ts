import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { writeActivityLog } from "@/lib/activity-log";
import { db } from "@/lib/db";
import { getInvoiceStatusUpdate } from "@/lib/invoices/status";
import { verifyStripeWebhookEvent } from "@/lib/payments/stripe";

function toDateFromUnixSeconds(unixSeconds: number) {
  return new Date(unixSeconds * 1000);
}

function getMetadataValue(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isUniqueViolation(error: unknown) {
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : null;

  return code === "P2002";
}

async function recordStripePaymentFromEvent(event: {
  id: string;
  created: number;
  amount: number;
  businessId: string;
  invoiceId: string;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
}) {
  await db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: {
        id: event.invoiceId,
        businessId: event.businessId,
      },
      select: {
        id: true,
        status: true,
        dueAt: true,
        total: true,
        paidAmount: true,
      },
    });

    if (!invoice || event.amount <= 0) {
      return;
    }

    const remainingBalance = invoice.total - invoice.paidAmount;
    const amountToApply = Math.min(event.amount, Math.max(remainingBalance, 0));

    if (amountToApply <= 0) {
      return;
    }

    const recordedAt = toDateFromUnixSeconds(event.created);

    await tx.payment.create({
      data: {
        businessId: event.businessId,
        invoiceId: invoice.id,
        amount: amountToApply,
        method: "STRIPE_CHECKOUT",
        source: "STRIPE",
        stripePaymentIntentId: event.stripePaymentIntentId,
        stripeCheckoutSessionId: event.stripeCheckoutSessionId,
        stripeEventId: event.id,
        recordedAt,
      },
    });

    const nextPaidAmount = invoice.paidAmount + amountToApply;
    const nextStatus =
      getInvoiceStatusUpdate({
        currentStatus: invoice.status,
        total: invoice.total,
        paidAmount: nextPaidAmount,
        dueDate: invoice.dueAt,
        now: recordedAt,
      }) ?? invoice.status;

    await tx.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        paidAmount: nextPaidAmount,
        status: nextStatus,
      },
    });
  });

  await writeActivityLog({
    businessId: event.businessId,
    type: "STRIPE_PAYMENT_COMPLETED",
    title: "Stripe payment completed",
    message: `${event.amount.toLocaleString()} minor units were confirmed via Stripe checkout.`,
    metadata: {
      invoiceId: event.invoiceId,
      stripeEventId: event.id,
      stripePaymentIntentId: event.stripePaymentIntentId,
      stripeCheckoutSessionId: event.stripeCheckoutSessionId,
    },
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe signature." }, { status: 400 });
  }

  const payload = await request.text();

  let event;
  try {
    event = verifyStripeWebhookEvent(payload, signature);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const metadata = session.metadata;
    const businessId = getMetadataValue(metadata, "businessId");
    const invoiceId = getMetadataValue(metadata, "invoiceId");
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

    if (businessId && invoiceId) {
      try {
        await recordStripePaymentFromEvent({
          id: event.id,
          created: event.created,
          amount: typeof session.amount_total === "number" ? session.amount_total : 0,
          businessId,
          invoiceId,
          stripePaymentIntentId: paymentIntentId,
          stripeCheckoutSessionId: session.id,
        });
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
