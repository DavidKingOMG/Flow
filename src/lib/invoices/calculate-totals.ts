export type InvoiceTotalsLineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type CalculatedInvoiceLineItem = InvoiceTotalsLineItemInput & {
  lineTotal: number;
};

export type CalculateInvoiceTotalsInput = {
  items: InvoiceTotalsLineItemInput[];
  taxRateBps?: number;
};

export type CalculatedInvoiceTotals = {
  items: CalculatedInvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
};

export function calculateInvoiceTotals({
  items,
  taxRateBps = 0,
}: CalculateInvoiceTotalsInput): CalculatedInvoiceTotals {
  const calculatedItems = items.map((item) => ({
    ...item,
    lineTotal: item.quantity * item.unitPrice,
  }));

  const subtotal = calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = Math.round((subtotal * taxRateBps) / 10_000);

  return {
    items: calculatedItems,
    subtotal,
    tax,
    total: subtotal + tax,
  };
}
