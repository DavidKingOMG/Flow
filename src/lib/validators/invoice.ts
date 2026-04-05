import { z } from "zod";
import { parseDateOnlyInput } from "@/lib/invoices/date-only";
import { invoiceStatuses } from "@/lib/invoices/status";

const createInvoiceStatuses = ["DRAFT", "SENT"] as const;

const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(1, "Line item description is required"),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  unitPrice: z.coerce.number().int().nonnegative("Unit price must be 0 or more"),
});

const dateOnlySchema = z
  .string()
  .trim()
  .min(1, "Date is required")
  .transform((value, context) => {
    try {
      return parseDateOnlyInput(value);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date must use YYYY-MM-DD format",
      });

      return z.NEVER;
    }
  });

export const createInvoiceSchema = z
  .object({
    clientId: z.string().trim().min(1, "Choose a client"),
    issuedAt: dateOnlySchema,
    dueAt: dateOnlySchema,
    status: z.enum(createInvoiceStatuses).default("DRAFT"),
    taxRateBps: z.coerce
      .number()
      .int()
      .min(0, "Tax rate must be 0 or more")
      .max(10_000, "Tax rate cannot exceed 100%"),
    notes: z.string().trim().optional(),
    lineItems: z.array(invoiceLineItemSchema).min(1, "Add at least one line item"),
  })
  .superRefine((input, context) => {
    if (input.dueAt.getTime() < input.issuedAt.getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueAt"],
        message: "Due date cannot be earlier than the issue date",
      });
    }
  });

export const invoiceStatusSchema = z.enum(invoiceStatuses);

export type CreateInvoiceInput = z.input<typeof createInvoiceSchema>;
export type CreateInvoiceData = z.output<typeof createInvoiceSchema>;
export type InvoiceLineItemInput = z.output<typeof invoiceLineItemSchema>;
