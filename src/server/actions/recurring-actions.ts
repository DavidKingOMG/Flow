"use server";

import { revalidatePath } from "next/cache";
import { writeActivityLog } from "@/lib/activity-log";
import { assertBusinessAccess, requireActiveBusiness } from "@/lib/business-context";
import { db } from "@/lib/db";
import { initialCreateRecurringTemplateFormState } from "@/lib/forms/initial-form-states";
import { assertBillingAccess, BillingAccessError } from "@/lib/invoices/authorization";
import { getScheduleAnchor } from "@/lib/recurring/schedule";
import {
  createRecurringTemplateSchema,
  type CreateRecurringTemplateData,
} from "@/lib/validators/recurring";

type RecurringTemplateFormField =
  | "name"
  | "clientId"
  | "frequency"
  | "intervalCount"
  | "startsAt"
  | "endsAt"
  | "dueInDays"
  | "invoiceStatus"
  | "taxRateBps"
  | "notes"
  | "lineItems";

type FieldErrors = Partial<Record<RecurringTemplateFormField, string[]>>;

export type RecurringTemplateFormLineItemValue = {
  description: string;
  quantity: string;
  unitPrice: string;
};

export type CreateRecurringTemplateFormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: FieldErrors;
  values: {
    name: string;
    clientId: string;
    frequency: "WEEKLY" | "MONTHLY";
    intervalCount: string;
    startsAt: string;
    endsAt: string;
    dueInDays: string;
    invoiceStatus: "DRAFT" | "SENT";
    taxRateBps: string;
    notes: string;
    lineItems: RecurringTemplateFormLineItemValue[];
  };
};

class RecurringTemplateClientNotFoundError extends Error {
  constructor() {
    super("Choose an active client that belongs to your active business.");
    this.name = "RecurringTemplateClientNotFoundError";
  }
}

function readFormDataEntry(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function createEmptyLineItem() {
  return { description: "", quantity: "1", unitPrice: "0" };
}

function toFormLineItems(rawLineItems: unknown): RecurringTemplateFormLineItemValue[] {
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

function parseLineItems(rawValue: string): unknown {
  if (!rawValue.trim()) {
    return [];
  }

  return JSON.parse(rawValue);
}

function extractValues(rawInput: {
  name?: string;
  clientId?: string;
  frequency?: string;
  intervalCount?: string;
  startsAt?: string;
  endsAt?: string;
  dueInDays?: string;
  invoiceStatus?: string;
  taxRateBps?: string;
  notes?: string;
  lineItems?: unknown;
}): CreateRecurringTemplateFormState["values"] {
  return {
    name: rawInput.name ?? "",
    clientId: rawInput.clientId ?? "",
    frequency: rawInput.frequency === "WEEKLY" ? "WEEKLY" : "MONTHLY",
    intervalCount: rawInput.intervalCount ?? "1",
    startsAt: rawInput.startsAt ?? "",
    endsAt: rawInput.endsAt ?? "",
    dueInDays: rawInput.dueInDays ?? "0",
    invoiceStatus: rawInput.invoiceStatus === "SENT" ? "SENT" : "DRAFT",
    taxRateBps: rawInput.taxRateBps ?? "0",
    notes: rawInput.notes ?? "",
    lineItems: toFormLineItems(rawInput.lineItems),
  };
}

function normalizeRecurringTemplateData(input: CreateRecurringTemplateData) {
  const scheduleAnchor = getScheduleAnchor({
    frequency: input.frequency,
    startsAt: input.startsAt,
  });

  return {
    name: input.name.trim(),
    clientId: input.clientId.trim(),
    frequency: input.frequency,
    intervalCount: input.intervalCount,
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    dueInDays: input.dueInDays,
    invoiceStatus: input.invoiceStatus,
    taxRateBps: input.taxRateBps,
    notes: input.notes?.trim() || null,
    dayOfWeek: scheduleAnchor.dayOfWeek,
    dayOfMonth: scheduleAnchor.dayOfMonth,
    nextRunAt: scheduleAnchor.nextRunAt,
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
    throw new RecurringTemplateClientNotFoundError();
  }
}

function createClientNotFoundState(
  values: CreateRecurringTemplateFormState["values"],
): CreateRecurringTemplateFormState {
  return {
    status: "error",
    message: "Choose an active client that belongs to your active business.",
    fieldErrors: {
      clientId: ["Choose an active client that belongs to your active business."],
    },
    values,
  };
}

export async function createRecurringTemplateAction(
  _previousState: CreateRecurringTemplateFormState,
  formData: FormData,
): Promise<CreateRecurringTemplateFormState> {
  const rawInput = {
    name: readFormDataEntry(formData, "name"),
    clientId: readFormDataEntry(formData, "clientId"),
    frequency: readFormDataEntry(formData, "frequency"),
    intervalCount: readFormDataEntry(formData, "intervalCount"),
    startsAt: readFormDataEntry(formData, "startsAt"),
    endsAt: readFormDataEntry(formData, "endsAt"),
    dueInDays: readFormDataEntry(formData, "dueInDays"),
    invoiceStatus: readFormDataEntry(formData, "invoiceStatus"),
    taxRateBps: readFormDataEntry(formData, "taxRateBps"),
    notes: readFormDataEntry(formData, "notes"),
    lineItems: [] as unknown,
  };

  try {
    rawInput.lineItems = parseLineItems(readFormDataEntry(formData, "lineItems"));
  } catch {
    return {
      status: "error",
      message: "Fix the highlighted recurring billing details and try again.",
      fieldErrors: {
        lineItems: ["Line items must be valid before saving the recurring template."],
      },
      values: extractValues(rawInput),
    };
  }

  const parsed = createRecurringTemplateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Fix the highlighted recurring billing details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: extractValues(rawInput),
    };
  }

  const context = await requireActiveBusiness();

  let createdTemplateName: string | null = null;

  try {
    assertBillingAccess(context);
    assertBusinessAccess({
      activeBusinessId: context.activeBusinessId,
      resourceBusinessId: context.businessId,
    });

    const input = normalizeRecurringTemplateData(parsed.data);

    await assertClientBelongsToBusiness(context.businessId, input.clientId);

    await db.recurringInvoiceTemplate.create({
      data: {
        businessId: context.businessId,
        clientId: input.clientId,
        name: input.name,
        status: "ACTIVE",
        frequency: input.frequency,
        intervalCount: input.intervalCount,
        dayOfWeek: input.dayOfWeek,
        dayOfMonth: input.dayOfMonth,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        nextRunAt: input.nextRunAt,
        dueInDays: input.dueInDays,
        invoiceStatus: input.invoiceStatus,
        taxRateBps: input.taxRateBps,
        notes: input.notes,
        lineItems: {
          create: input.lineItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sortOrder: index,
          })),
        },
      },
    });

    createdTemplateName = input.name;
  } catch (error) {
    if (error instanceof BillingAccessError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {},
        values: extractValues(rawInput),
      };
    }

    if (error instanceof RecurringTemplateClientNotFoundError) {
      return createClientNotFoundState(extractValues(rawInput));
    }

    throw error;
  }

  await writeActivityLog({
    businessId: context.businessId,
    actorUserId: context.userId,
    type: "RECURRING_TEMPLATE_CREATED",
    title: "Recurring template created",
    message: `${createdTemplateName ?? "Recurring template"} is now active in the billing queue.`,
    metadata: {
      frequency: parsed.data.frequency,
      invoiceStatus: parsed.data.invoiceStatus,
    },
  });

  revalidatePath("/recurring");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Recurring template created.",
    fieldErrors: {},
    values: initialCreateRecurringTemplateFormState.values,
  };
}
