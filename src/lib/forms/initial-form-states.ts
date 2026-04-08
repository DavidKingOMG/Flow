import type {
  CreateClientFormState,
} from "@/server/actions/client-actions";
import type { CreateInvoiceFormState } from "@/server/actions/invoice-actions";
import type { CreateManualPaymentFormState } from "@/server/actions/payment-actions";
import type { CreateRecurringTemplateFormState } from "@/server/actions/recurring-actions";

export const initialCreateClientFormState: CreateClientFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  conflicts: [],
  values: {
    fullName: "",
    companyName: "",
    email: "",
    phone: "",
    notes: "",
    loginEnabled: false,
    username: "",
    password: "",
  },
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

export const initialCreateRecurringTemplateFormState: CreateRecurringTemplateFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: {
    name: "",
    clientId: "",
    frequency: "MONTHLY",
    intervalCount: "1",
    startsAt: "",
    endsAt: "",
    dueInDays: "0",
    invoiceStatus: "DRAFT",
    taxRateBps: "0",
    notes: "",
    lineItems: [{ description: "", quantity: "1", unitPrice: "0" }],
  },
};
