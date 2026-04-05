import { compareDateOnly } from "@/lib/invoices/date-only";

export const invoiceStatuses = ["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELED"] as const;

export type InvoiceStatusValue = (typeof invoiceStatuses)[number];

type TransitionInvoiceStatusInput = {
  currentStatus: InvoiceStatusValue;
  total: number;
  paidAmount: number;
  dueDate: Date;
  now?: Date;
};

export function transitionInvoiceStatus({
  currentStatus,
  total,
  paidAmount,
  dueDate,
  now = new Date(),
}: TransitionInvoiceStatusInput): InvoiceStatusValue {
  if (currentStatus === "CANCELED" || currentStatus === "DRAFT") {
    return currentStatus;
  }

  if (total > 0 && paidAmount >= total) {
    return "PAID";
  }

  if (paidAmount > 0) {
    return compareDateOnly(dueDate, now) < 0 ? "OVERDUE" : "PARTIAL";
  }

  if (compareDateOnly(dueDate, now) < 0) {
    return "OVERDUE";
  }

  return "SENT";
}

export function getInvoiceStatusUpdate(input: TransitionInvoiceStatusInput): InvoiceStatusValue | null {
  const nextStatus = transitionInvoiceStatus(input);

  return nextStatus === input.currentStatus ? null : nextStatus;
}
