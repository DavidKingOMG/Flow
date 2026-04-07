"use server";

import { revalidatePath } from "next/cache";
import { writeActivityLog } from "@/lib/activity-log";
import { assertBusinessAccess, requireActiveBusiness, type ActiveBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { assertBillingAccess, BillingAccessError } from "@/lib/invoices/authorization";
import { calculateInvoiceTotals } from "@/lib/invoices/calculate-totals";
import { transitionInvoiceStatus } from "@/lib/invoices/status";
import {
  createInvoiceSchema,
  type CreateInvoiceData,
  type CreateInvoiceInput,
} from "@/lib/validators/invoice";

type InvoiceFormField =
  | "clientId"
  | "issuedAt"
  | "dueAt"
  | "status"
  | "taxRateBps"
  | "notes"
  | "lineItems";

type FieldErrors = Partial<Record<InvoiceFormField, string[]>>;

export type InvoiceFormLineItemValue = {
  description: string;
  quantity: string;
  unitPrice: string;
};

type RecurringInvoiceMetadata = {
  recurringTemplateId?: string | null;
  recurringWindowStart?: Date | null;
};

export type CreateInvoiceFormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: FieldErrors;
  values: {
    clientId: string;
    issuedAt: string;
    dueAt: string;
    status: "DRAFT" | "SENT";
    taxRateBps: string;
    notes: string;
    lineItems: InvoiceFormLineItemValue[];
  };
};

export const initialCreateInvoiceFormState: CreateInvoiceFormState = {
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
};

class InvoiceClientNotFoundError extends Error {
  constructor() {
    super("Choose an active client that belongs to your active business.");
    this.name = "InvoiceClientNotFoundError";
  }
}

class InvoiceRecurringTemplateAccessError extends Error {
  constructor() {
    super("Recurring template links must belong to the same business and client as the invoice.");
    this.name = "InvoiceRecurringTemplateAccessError";
  }
}

function readFormDataEntry(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formatInvoiceNumber(sequence: number): string {
  return `INV-${sequence.toString().padStart(6, "0")}`;
}

function createEmptyLineItem() {
  return { description: "", quantity: "1", unitPrice: "0" };
}

function toFormLineItems(rawLineItems: unknown): InvoiceFormLineItemValue[] {
  if (!Array.isArray(rawLineItems) || rawLineItems.length === 0) {
    return [createEmptyLineItem()];
  }

  return rawLineItems.map((item) => {
    const record = typeof item === "object" && item !== null ? item : {};

    return {
      description: String("description" in record ? record.description ?? "" : ""),
      quantity: String("quantity" in record ? record.quantity ?? "" : ""),
      unitPrice: String("unitPrice" in record ? record.unitPrice ?? "" : ""),
    };
  });
}

function extractValues(rawInput: {
  clientId?: string;
  issuedAt?: string;
  dueAt?: string;
  status?: string;
  taxRateBps?: string;
  notes?: string;
  lineItems?: unknown;
}): CreateInvoiceFormState["values"] {
  return {
    clientId: rawInput.clientId ?? "",
    issuedAt: rawInput.issuedAt ?? "",
    dueAt: rawInput.dueAt ?? "",
    status: rawInput.status === "SENT" ? "SENT" : "DRAFT",
    taxRateBps: rawInput.taxRateBps ?? "0",
    notes: rawInput.notes ?? "",
    lineItems: toFormLineItems(rawInput.lineItems),
  };
}

function parseLineItems(rawValue: string): unknown {
  if (!rawValue.trim()) {
    return [];
  }

  return JSON.parse(rawValue);
}

function normalizeInvoiceData(input: CreateInvoiceData) {
  return {
    clientId: input.clientId.trim(),
    issuedAt: input.issuedAt,
    dueAt: input.dueAt,
    status: input.status,
    taxRateBps: input.taxRateBps,
    notes: input.notes?.trim() || null,
    lineItems: input.lineItems.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}

async function assertClientBelongsToBusiness(businessId: string, clientId: string) {
  const client = await db.client.findFirst({
    where: {
      id: clientId,
      businessId,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!client) {
    throw new InvoiceClientNotFoundError();
  }
}

async function assertRecurringTemplateBelongsToInvoice(
  businessId: string,
  clientId: string,
  recurringTemplateId: string | null | undefined,
) {
  if (!recurringTemplateId) {
    return;
  }

  const template = await db.recurringInvoiceTemplate.findFirst({
    where: {
      id: recurringTemplateId,
      businessId,
      clientId,
    },
    select: {
      id: true,
    },
  });

  if (!template) {
    throw new InvoiceRecurringTemplateAccessError();
  }
}

function createClientNotFoundState(values: CreateInvoiceFormState["values"]): CreateInvoiceFormState {
  return {
    status: "error",
    message: "Choose an active client that belongs to your active business.",
    fieldErrors: {
      clientId: ["Choose an active client that belongs to your active business."],
    },
    values,
  };
}

export async function createInvoiceForBusiness(
  context: Pick<ActiveBusinessContext, "businessId" | "activeBusinessId" | "userId" | "role">,
  rawInput: (CreateInvoiceInput | CreateInvoiceData) & RecurringInvoiceMetadata,
) {
  assertBillingAccess(context);
  assertBusinessAccess({
    activeBusinessId: context.activeBusinessId,
    resourceBusinessId: context.businessId,
  });

  let parsed: CreateInvoiceData;
  const recurringMetadata: RecurringInvoiceMetadata = {
    recurringTemplateId: rawInput.recurringTemplateId ?? null,
    recurringWindowStart: rawInput.recurringWindowStart ?? null,
  };

  if (rawInput.issuedAt instanceof Date && rawInput.dueAt instanceof Date) {
    parsed = rawInput as CreateInvoiceData;
  } else {
    parsed = createInvoiceSchema.parse(rawInput);
  }
  const input = normalizeInvoiceData(parsed);

  await assertClientBelongsToBusiness(context.businessId, input.clientId);
  await assertRecurringTemplateBelongsToInvoice(
    context.businessId,
    input.clientId,
    recurringMetadata.recurringTemplateId,
  );

  const totals = calculateInvoiceTotals({
    items: input.lineItems,
    taxRateBps: input.taxRateBps,
  });

  return db.$transaction(async (transaction) => {
    const { nextInvoiceNumber } = await transaction.businessSettings.update({
      where: {
        businessId: context.businessId,
      },
      data: {
        nextInvoiceNumber: {
          increment: 1,
        },
      },
      select: {
        nextInvoiceNumber: true,
      },
    });

    const invoiceNumber = formatInvoiceNumber(nextInvoiceNumber - 1);
    const status =
      input.status === "DRAFT"
        ? "DRAFT"
        : transitionInvoiceStatus({
            currentStatus: "SENT",
            total: totals.total,
            paidAmount: 0,
            dueDate: input.dueAt,
          });

    const invoice = await transaction.invoice.create({
      data: {
        businessId: context.businessId,
        clientId: input.clientId,
        recurringTemplateId: recurringMetadata.recurringTemplateId,
        recurringWindowStart: recurringMetadata.recurringWindowStart,
        invoiceNumber,
        status,
        issuedAt: input.issuedAt,
        dueAt: input.dueAt,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        paidAmount: 0,
        taxRateBps: input.taxRateBps,
        notes: input.notes,
        lineItems: {
          create: totals.items.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            sortOrder: index,
          })),
        },
      },
    });

    return {
      invoice,
      invoiceNumber,
    };
  });
}

export async function createInvoiceAction(
  _previousState: CreateInvoiceFormState,
  formData: FormData,
): Promise<CreateInvoiceFormState> {
  const rawInput = {
    clientId: readFormDataEntry(formData, "clientId"),
    issuedAt: readFormDataEntry(formData, "issuedAt"),
    dueAt: readFormDataEntry(formData, "dueAt"),
    status: readFormDataEntry(formData, "status"),
    taxRateBps: readFormDataEntry(formData, "taxRateBps"),
    notes: readFormDataEntry(formData, "notes"),
    lineItems: [] as unknown,
  };

  try {
    rawInput.lineItems = parseLineItems(readFormDataEntry(formData, "lineItems"));
  } catch {
    return {
      status: "error",
      message: "Fix the highlighted invoice details and try again.",
      fieldErrors: {
        lineItems: ["Line items must be valid before saving the invoice."],
      },
      values: extractValues(rawInput),
    };
  }

  const parsed = createInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Fix the highlighted invoice details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: extractValues(rawInput),
    };
  }

  const context = await requireActiveBusiness();

  try {
    await createInvoiceForBusiness(context, parsed.data);
  } catch (error) {
    if (error instanceof BillingAccessError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {},
        values: extractValues(rawInput),
      };
    }

    if (error instanceof InvoiceClientNotFoundError) {
      return createClientNotFoundState(extractValues(rawInput));
    }

    throw error;
  }

  revalidatePath("/invoices");
  revalidatePath("/invoices/new");

  return {
    status: "success",
    message: "Invoice created.",
    fieldErrors: {},
    values: initialCreateInvoiceFormState.values,
  };
}
