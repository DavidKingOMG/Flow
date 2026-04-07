import { z } from "zod";
import { parseDateOnlyInput } from "@/lib/invoices/date-only";

const recurringFrequencies = ["WEEKLY", "MONTHLY"] as const;
const recurringInvoiceStatuses = ["DRAFT", "SENT"] as const;

const recurringLineItemSchema = z.object({
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

const optionalDateOnlySchema = z
  .string()
  .trim()
  .optional()
  .transform((value, context) => {
    if (!value) {
      return undefined;
    }

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

export const createRecurringTemplateSchema = z
  .object({
    name: z.string().trim().min(1, "Template name is required"),
    clientId: z.string().trim().min(1, "Choose a client"),
    frequency: z.enum(recurringFrequencies),
    intervalCount: z.coerce.number().int().positive("Interval must be at least 1").max(12, "Interval is too large for V1"),
    startsAt: dateOnlySchema,
    endsAt: optionalDateOnlySchema,
    dueInDays: z.coerce.number().int().min(0, "Due days must be 0 or more").max(365, "Due days cannot exceed 365"),
    invoiceStatus: z.enum(recurringInvoiceStatuses).default("DRAFT"),
    taxRateBps: z.coerce
      .number()
      .int()
      .min(0, "Tax rate must be 0 or more")
      .max(10_000, "Tax rate cannot exceed 100%"),
    notes: z.string().trim().optional(),
    lineItems: z.array(recurringLineItemSchema).min(1, "Add at least one line item"),
  })
  .superRefine((input, context) => {
    if (input.frequency === "MONTHLY" && input.startsAt.getDate() > 28) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startsAt"],
        message: "Monthly recurring schedules must start on or before the 28th in V1.",
      });
    }

    if (input.endsAt && input.endsAt.getTime() < input.startsAt.getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "End date cannot be earlier than the start date.",
      });
    }
  });

export type CreateRecurringTemplateInput = z.input<typeof createRecurringTemplateSchema>;
export type CreateRecurringTemplateData = z.output<typeof createRecurringTemplateSchema>;
export type RecurringTemplateLineItemInput = z.output<typeof recurringLineItemSchema>;
