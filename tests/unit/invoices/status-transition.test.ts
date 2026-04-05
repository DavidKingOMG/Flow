import { describe, expect, it } from "vitest";
import { getInvoiceStatusUpdate, transitionInvoiceStatus } from "@/lib/invoices/status";

describe("transitionInvoiceStatus", () => {
  it("marks an invoice as partial after a partial payment before the due date", () => {
    const next = transitionInvoiceStatus({
      currentStatus: "SENT",
      total: 50000,
      paidAmount: 20000,
      dueDate: new Date("2026-05-01T00:00:00.000Z"),
      now: new Date("2026-04-20T00:00:00.000Z"),
    });

    expect(next).toBe("PARTIAL");
  });

  it("marks an unpaid sent invoice as overdue after the due date", () => {
    const next = transitionInvoiceStatus({
      currentStatus: "SENT",
      total: 50000,
      paidAmount: 0,
      dueDate: new Date("2026-04-01T00:00:00.000Z"),
      now: new Date("2026-04-20T00:00:00.000Z"),
    });

    expect(next).toBe("OVERDUE");
  });

  it("does not mark a due-today invoice overdue before the calendar day ends", () => {
    const next = transitionInvoiceStatus({
      currentStatus: "SENT",
      total: 50000,
      paidAmount: 0,
      dueDate: new Date(2026, 3, 20, 12, 0, 0, 0),
      now: new Date(2026, 3, 20, 23, 59, 59, 999),
    });

    expect(next).toBe("SENT");
  });

  it("keeps canceled invoices terminal", () => {
    const next = transitionInvoiceStatus({
      currentStatus: "CANCELED",
      total: 50000,
      paidAmount: 0,
      dueDate: new Date("2026-04-01T00:00:00.000Z"),
      now: new Date("2026-04-20T00:00:00.000Z"),
    });

    expect(next).toBe("CANCELED");
  });

  it("returns a persisted status update when a sent invoice has become overdue", () => {
    const next = getInvoiceStatusUpdate({
      currentStatus: "SENT",
      total: 50000,
      paidAmount: 0,
      dueDate: new Date("2026-04-01T00:00:00.000Z"),
      now: new Date("2026-04-20T00:00:00.000Z"),
    });

    expect(next).toBe("OVERDUE");
  });

  it("skips persisted writes when the stored status is already current", () => {
    const next = getInvoiceStatusUpdate({
      currentStatus: "OVERDUE",
      total: 50000,
      paidAmount: 0,
      dueDate: new Date("2026-04-01T00:00:00.000Z"),
      now: new Date("2026-04-20T00:00:00.000Z"),
    });

    expect(next).toBeNull();
  });
});
