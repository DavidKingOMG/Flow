"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  createInvoiceAction,
  initialCreateInvoiceFormState,
  type InvoiceFormLineItemValue,
} from "@/server/actions/invoice-actions";

type InvoiceFormProps = {
  clients: Array<{
    id: string;
    fullName: string;
    companyName: string | null;
  }>;
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return <p className="text-sm text-rose-300">{errors[0]}</p>;
}

type TextInputProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  type?: string;
  placeholder?: string;
  min?: number;
  step?: number;
  required?: boolean;
};

function TextInput({
  label,
  name,
  value,
  onChange,
  errors,
  type = "text",
  placeholder,
  min,
  step,
  required,
}: TextInputProps) {
  return (
    <label className="grid gap-2 text-sm text-slate-200">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        required={required}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
      />
      <FieldError errors={errors} />
    </label>
  );
}

function emptyLineItem(): InvoiceFormLineItemValue {
  return {
    description: "",
    quantity: "1",
    unitPrice: "0",
  };
}

type LocalInvoiceLineItemValue = InvoiceFormLineItemValue & {
  localId: string;
};

function stripLocalId(item: LocalInvoiceLineItemValue): InvoiceFormLineItemValue {
  return {
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  };
}

export function InvoiceForm({ clients }: InvoiceFormProps) {
  const [state, formAction, pending] = useActionState(createInvoiceAction, initialCreateInvoiceFormState);
  const [values, setValues] = useState(state.values);
  const lineItemIdRef = useRef(0);
  const [lineItems, setLineItems] = useState<LocalInvoiceLineItemValue[]>(() =>
    state.values.lineItems.map((item) => ({
      ...item,
      localId: `line-item-${lineItemIdRef.current++}`,
    })),
  );

  useEffect(() => {
    setValues(state.values);
    setLineItems(
      state.values.lineItems.map((item) => ({
        ...item,
        localId: `line-item-${lineItemIdRef.current++}`,
      })),
    );
  }, [state.values]);

  const hasClients = clients.length > 0;

  function updateLineItem(localId: string, field: keyof InvoiceFormLineItemValue, value: string) {
    setLineItems((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="lineItems" value={JSON.stringify(lineItems.map(stripLocalId))} readOnly />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-200">
          Client
          <select
            name="clientId"
            value={values.clientId}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                clientId: event.target.value,
              }))
            }
            required
            disabled={!hasClients}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-60"
          >
            <option value="">Select a client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.fullName}
                {client.companyName ? ` - ${client.companyName}` : ""}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors.clientId} />
        </label>

        <label className="grid gap-2 text-sm text-slate-200">
          Initial status
          <select
            name="status"
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                status: event.target.value === "SENT" ? "SENT" : "DRAFT",
              }))
            }
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
          >
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
          </select>
          <FieldError errors={state.fieldErrors.status} />
        </label>

        <TextInput
          label="Issue date"
          name="issuedAt"
          type="date"
          value={values.issuedAt}
          onChange={(value) =>
            setValues((current) => ({
              ...current,
              issuedAt: value,
            }))
          }
          errors={state.fieldErrors.issuedAt}
          required
        />
        <TextInput
          label="Due date"
          name="dueAt"
          type="date"
          value={values.dueAt}
          onChange={(value) =>
            setValues((current) => ({
              ...current,
              dueAt: value,
            }))
          }
          errors={state.fieldErrors.dueAt}
          required
        />
        <TextInput
          label="Tax rate (basis points)"
          name="taxRateBps"
          type="number"
          value={values.taxRateBps}
          onChange={(value) =>
            setValues((current) => ({
              ...current,
              taxRateBps: value,
            }))
          }
          errors={state.fieldErrors.taxRateBps}
          min={0}
          step={1}
          required
        />
      </div>

      <label className="grid gap-2 text-sm text-slate-200">
        Notes
        <textarea
          name="notes"
          rows={4}
          value={values.notes}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
          placeholder="Payment terms or delivery notes."
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
        />
        <FieldError errors={state.fieldErrors.notes} />
      </label>

      <section className="grid gap-4 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Line items</h2>
            <p className="mt-1 text-sm text-slate-400">
              Enter quantity and unit price in minor units for V1-safe invoice math.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setLineItems((current) => [
                ...current,
                {
                  ...emptyLineItem(),
                  localId: `line-item-${lineItemIdRef.current++}`,
                },
              ])
            }
            className="rounded-full border border-cyan-300/20 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            Add line
          </button>
        </div>

        {lineItems.map((item, index) => (
          <div
            key={item.localId}
            className="grid gap-4 rounded-[1.5rem] border border-white/8 bg-slate-950/30 p-4 md:grid-cols-[minmax(0,1.4fr)_140px_180px_auto]"
          >
            <TextInput
              label={`Description ${index + 1}`}
              name={`lineItemDescription-${index}`}
              value={item.description}
              onChange={(value) => updateLineItem(item.localId, "description", value)}
              placeholder="Retainer work"
              required
            />
            <TextInput
              label="Quantity"
              name={`lineItemQuantity-${index}`}
              type="number"
              value={item.quantity}
              onChange={(value) => updateLineItem(item.localId, "quantity", value)}
              min={1}
              step={1}
              required
            />
            <TextInput
              label="Unit price (minor units)"
              name={`lineItemUnitPrice-${index}`}
              type="number"
              value={item.unitPrice}
              onChange={(value) => updateLineItem(item.localId, "unitPrice", value)}
              min={0}
              step={1}
              required
            />

            <div className="flex items-end justify-end">
              <button
                type="button"
                disabled={lineItems.length === 1}
                onClick={() =>
                  setLineItems((current) =>
                    current.length === 1 ? current : current.filter((candidate) => candidate.localId !== item.localId),
                  )
                }
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <FieldError errors={state.fieldErrors.lineItems} />
      </section>

      {state.message ? (
        <div
          className={`rounded-[1.5rem] border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
              : "border-rose-400/25 bg-rose-400/10 text-rose-100"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !hasClients}
          className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Saving invoice..." : "Save invoice"}
        </button>
        <Link href="/invoices" className="text-sm text-cyan-200 transition hover:text-cyan-100">
          Back to invoices
        </Link>
      </div>
    </form>
  );
}
