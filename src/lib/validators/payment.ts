import { z } from "zod";
import { parseDateOnlyInput } from "@/lib/invoices/date-only";

export const manualPaymentMethodValues = ["BANK_TRANSFER", "CASH", "CARD", "OTHER"] as const;

const dateOnlySchema = z
  .string()
  .trim()
  .min(1, "Recorded date is required")
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

export const recordManualPaymentSchema = z.object({
  invoiceId: z.string().trim().min(1, "Choose an invoice"),
  amount: z.coerce.number().int().positive("Payment amount must be greater than 0"),
  method: z.enum(manualPaymentMethodValues),
  recordedAt: dateOnlySchema,
  notes: z.string().trim().optional(),
});

export type RecordManualPaymentInput = z.input<typeof recordManualPaymentSchema>;
export type RecordManualPaymentData = z.output<typeof recordManualPaymentSchema>;
