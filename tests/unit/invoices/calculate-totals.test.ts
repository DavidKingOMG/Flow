import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals } from "@/lib/invoices/calculate-totals";

describe("calculateInvoiceTotals", () => {
  it("calculates subtotal, tax, and total in integer minor units", () => {
    const result = calculateInvoiceTotals({
      items: [
        { description: "Strategy session", quantity: 2, unitPrice: 15000 },
        { description: "Support retainer", quantity: 1, unitPrice: 5000 },
      ],
      taxRateBps: 1000,
    });

    expect(result.subtotal).toBe(35000);
    expect(result.tax).toBe(3500);
    expect(result.total).toBe(38500);
  });

  it("rounds fractional tax results back to minor units", () => {
    const result = calculateInvoiceTotals({
      items: [{ description: "Fractional tax item", quantity: 3, unitPrice: 333 }],
      taxRateBps: 875,
    });

    expect(result.subtotal).toBe(999);
    expect(result.tax).toBe(87);
    expect(result.total).toBe(1086);
  });
});
