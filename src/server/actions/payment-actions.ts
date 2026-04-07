"use server";

import { revalidatePath } from "next/cache";
import { writeActivityLog } from "@/lib/activity-log";
import { assertBusinessAccess, requireActiveBusiness } from "@/lib/business-context";
import { db } from "@/lib/db";
import { assertBillingAccess, BillingAccessError } from "@/lib/invoices/authorization";
import {
  PaymentAmountExceedsBalanceError,
  PaymentInvoiceNotFoundError,
  recordManualPayment,
} from "@/lib/payments/record-manual-payment";
import { recordManualPaymentSchema } from "@/lib/validators/payment";

type ManualPaymentField = "invoiceId" | "amount" | "method" | "recordedAt" | "notes";
type FieldErrors = Partial<Record<ManualPaymentField, string[]>>;

export type CreateManualPaymentFormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: FieldErrors;
  values: {
    invoiceId: string;
    amount: string;
    method: "BANK_TRANSFER" | "CASH" | "CARD" | "OTHER";
    recordedAt: string;
    notes: string;
  };
};

export const initialCreateManualPaymentFormState: CreateManualPaymentFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: {
    invoiceId: "",
    amount: "",
    method: "BANK_TRANSFER",
    recordedAt: "",
    notes: "",
  },
};

function readFormDataEntry(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function extractValues(rawInput: {
  invoiceId?: string;
  amount?: string;
  method?: string;
  recordedAt?: string;
  notes?: string;
}): CreateManualPaymentFormState["values"] {
  return {
    invoiceId: rawInput.invoiceId ?? "",
    amount: rawInput.amount ?? "",
    method:
      rawInput.method === "CASH" || rawInput.method === "CARD" || rawInput.method === "OTHER"
        ? rawInput.method
        : "BANK_TRANSFER",
    recordedAt: rawInput.recordedAt ?? "",
    notes: rawInput.notes ?? "",
  };
}

export async function createManualPaymentAction(
  _previousState: CreateManualPaymentFormState,
  formData: FormData,
): Promise<CreateManualPaymentFormState> {
  const rawInput = {
    invoiceId: readFormDataEntry(formData, "invoiceId"),
    amount: readFormDataEntry(formData, "amount"),
    method: readFormDataEntry(formData, "method"),
    recordedAt: readFormDataEntry(formData, "recordedAt"),
    notes: readFormDataEntry(formData, "notes"),
  };

  const parsed = recordManualPaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Fix the highlighted payment details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: extractValues(rawInput),
    };
  }

  const context = await requireActiveBusiness();

  try {
    assertBillingAccess(context);
    assertBusinessAccess({
      activeBusinessId: context.activeBusinessId,
      resourceBusinessId: context.businessId,
    });

    await recordManualPayment({
      businessId: context.businessId,
      invoiceId: parsed.data.invoiceId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      recordedAt: parsed.data.recordedAt,
      notes: parsed.data.notes,
    });

    await writeActivityLog({
      businessId: context.businessId,
      actorUserId: context.userId,
      type: "PAYMENT_RECORDED",
      title: "Manual payment recorded",
      message: `${parsed.data.amount.toLocaleString()} minor units were applied to an invoice.`,
      metadata: {
        invoiceId: parsed.data.invoiceId,
        method: parsed.data.method,
      },
    });
  } catch (error) {
    if (error instanceof BillingAccessError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {},
        values: extractValues(rawInput),
      };
    }

    if (error instanceof PaymentInvoiceNotFoundError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {
          invoiceId: [error.message],
        },
        values: extractValues(rawInput),
      };
    }

    if (error instanceof PaymentAmountExceedsBalanceError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {
          amount: [error.message],
        },
        values: extractValues(rawInput),
      };
    }

    throw error;
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Payment recorded.",
    fieldErrors: {},
    values: initialCreateManualPaymentFormState.values,
  };
}

export async function submitManualPaymentAction(formData: FormData): Promise<void> {
  const result = await createManualPaymentAction(initialCreateManualPaymentFormState, formData);

  if (result.status === "error") {
    throw new Error(result.message ?? "Unable to record payment.");
  }
}

export async function createStripeCheckoutSessionAction(invoiceId: string) {
  const context = await requireActiveBusiness();

  assertBillingAccess(context);
  assertBusinessAccess({
    activeBusinessId: context.activeBusinessId,
    resourceBusinessId: context.businessId,
  });

  const invoice = await db.invoice.findFirst({
    where: {
      id: invoiceId,
      businessId: context.businessId,
    },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      paidAmount: true,
      client: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new PaymentInvoiceNotFoundError();
  }

  const remainingAmount = invoice.total - invoice.paidAmount;
  if (remainingAmount <= 0) {
    throw new PaymentAmountExceedsBalanceError();
  }

  const { createStripeCheckoutSession } = await import("@/lib/payments/stripe-checkout");

  return createStripeCheckoutSession({
    businessId: context.businessId,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    amount: remainingAmount,
    customerName: invoice.client.fullName,
    customerEmail: invoice.client.email,
  });
}
