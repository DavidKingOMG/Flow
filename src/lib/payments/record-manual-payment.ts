import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getInvoiceStatusUpdate, type InvoiceStatusValue } from "@/lib/invoices/status";

export type RecordManualPaymentParams = {
  businessId: string;
  invoiceId: string;
  amount: number;
  method: "BANK_TRANSFER" | "CASH" | "CARD" | "OTHER";
  recordedAt: Date;
  notes?: string | null;
};

export class PaymentInvoiceNotFoundError extends Error {
  constructor() {
    super("Choose an invoice that belongs to your active business.");
    this.name = "PaymentInvoiceNotFoundError";
  }
}

export class PaymentAmountExceedsBalanceError extends Error {
  constructor() {
    super("Payment amount cannot exceed the remaining invoice balance.");
    this.name = "PaymentAmountExceedsBalanceError";
  }
}

function getStatusUpdate(input: {
  currentStatus: InvoiceStatusValue;
  total: number;
  paidAmount: number;
  dueAt: Date;
  now: Date;
}) {
  return (
    getInvoiceStatusUpdate({
      currentStatus: input.currentStatus,
      total: input.total,
      paidAmount: input.paidAmount,
      dueDate: input.dueAt,
      now: input.now,
    }) ?? input.currentStatus
  );
}

async function findInvoiceOrThrow(
  tx: Prisma.TransactionClient,
  businessId: string,
  invoiceId: string,
) {
  const invoice = await tx.invoice.findFirst({
    where: {
      id: invoiceId,
      businessId,
    },
    select: {
      id: true,
      businessId: true,
      status: true,
      dueAt: true,
      total: true,
      paidAmount: true,
      invoiceNumber: true,
    },
  });

  if (!invoice) {
    throw new PaymentInvoiceNotFoundError();
  }

  return invoice;
}

export async function recordManualPayment(
  params: RecordManualPaymentParams,
  prismaClient: PrismaClient = db,
) {
  const notes = params.notes?.trim() || null;

  return prismaClient.$transaction(async (tx) => {
    const invoice = await findInvoiceOrThrow(tx, params.businessId, params.invoiceId);
    const nextPaidAmount = invoice.paidAmount + params.amount;

    if (nextPaidAmount > invoice.total) {
      throw new PaymentAmountExceedsBalanceError();
    }

    const nextStatus = getStatusUpdate({
      currentStatus: invoice.status,
      total: invoice.total,
      paidAmount: nextPaidAmount,
      dueAt: invoice.dueAt,
      now: params.recordedAt,
    });

    const payment = await tx.payment.create({
      data: {
        businessId: params.businessId,
        invoiceId: invoice.id,
        amount: params.amount,
        method: params.method,
        source: "MANUAL",
        notes,
        recordedAt: params.recordedAt,
      },
    });

    const updatedInvoice = await tx.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        paidAmount: nextPaidAmount,
        status: nextStatus,
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

    return {
      payment,
      invoice: updatedInvoice,
    };
  });
}
