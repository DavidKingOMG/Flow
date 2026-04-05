import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/actions/invoice-actions", () => ({
  createInvoiceAction: vi.fn(),
  initialCreateInvoiceFormState: {
    status: "idle",
    message: null,
    fieldErrors: {},
    values: {
      clientId: "",
      issuedAt: "",
      dueAt: "",
      status: "DRAFT",
      taxRateBps: "0",
      notes: "",
      lineItems: [{ description: "", quantity: "1", unitPrice: "0" }],
    },
  },
}));

import { InvoiceForm } from "@/components/forms/invoice-form";

describe("InvoiceForm", () => {
  it("posts named issue, due, and tax fields", () => {
    render(
      <InvoiceForm
        clients={[
          {
            id: "client_123",
            fullName: "Northwind Studio",
            companyName: null,
          },
        ]}
      />,
    );

    expect(screen.getByLabelText(/issue date/i)).toHaveAttribute("name", "issuedAt");
    expect(screen.getByLabelText(/due date/i)).toHaveAttribute("name", "dueAt");
    expect(screen.getByLabelText(/tax rate/i)).toHaveAttribute("name", "taxRateBps");
  });
});
