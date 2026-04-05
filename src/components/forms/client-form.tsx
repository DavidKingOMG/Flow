"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  createClientAction,
  initialCreateClientFormState,
} from "@/server/actions/client-actions";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return <p className="text-sm text-rose-300">{errors[0]}</p>;
}

type InputProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  errors?: string[];
  required?: boolean;
};

function TextInput({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  errors,
  required,
}: InputProps) {
  return (
    <label className="grid gap-2 text-sm text-slate-200">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
      />
      <FieldError errors={errors} />
    </label>
  );
}

export function ClientForm() {
  const [state, formAction, pending] = useActionState(createClientAction, initialCreateClientFormState);
  const [loginEnabled, setLoginEnabled] = useState(state.values.loginEnabled);

  useEffect(() => {
    setLoginEnabled(state.values.loginEnabled);
  }, [state.values.loginEnabled]);

  const values = state.values;

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <TextInput
          label="Client name"
          name="fullName"
          placeholder="April Carson"
          defaultValue={values.fullName}
          errors={state.fieldErrors.fullName}
          required
        />
        <TextInput
          label="Company"
          name="companyName"
          placeholder="Northwind Studio"
          defaultValue={values.companyName}
          errors={state.fieldErrors.companyName}
        />
        <TextInput
          label="Email"
          name="email"
          type="email"
          placeholder="april@example.com"
          defaultValue={values.email}
          errors={state.fieldErrors.email}
          required
        />
        <TextInput
          label="Phone"
          name="phone"
          type="tel"
          placeholder="(555) 123-4567"
          defaultValue={values.phone}
          errors={state.fieldErrors.phone}
          required
        />
      </div>

      <label className="grid gap-2 text-sm text-slate-200">
        Notes
        <textarea
          name="notes"
          rows={4}
          placeholder="Helpful context for your team."
          defaultValue={values.notes}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
        />
        <FieldError errors={state.fieldErrors.notes} />
      </label>

      <label className="flex items-start gap-3 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-200">
        <input
          name="loginEnabled"
          type="checkbox"
          checked={loginEnabled}
          onChange={(event) => setLoginEnabled(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-cyan-300"
        />
        <span>
          <span className="block font-medium text-white">Enable client login</span>
          <span className="mt-1 block text-slate-400">
            Provision a limited client portal user linked to this contact.
          </span>
        </span>
      </label>

      {loginEnabled ? (
        <div className="grid gap-5 rounded-[1.75rem] border border-cyan-300/12 bg-cyan-300/[0.04] p-5 md:grid-cols-2">
          <TextInput
            label="Username"
            name="username"
            placeholder="april-portal"
            defaultValue={values.username}
            errors={state.fieldErrors.username}
            required={loginEnabled}
          />
          <TextInput
            label="Password"
            name="password"
            type="password"
            placeholder="Create a secure password"
            defaultValue={values.password}
            errors={state.fieldErrors.password}
            required={loginEnabled}
          />
        </div>
      ) : null}

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
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Saving client..." : "Save client"}
        </button>
        <Link href="/clients" className="text-sm text-cyan-200 transition hover:text-cyan-100">
          Back to clients
        </Link>
      </div>
    </form>
  );
}
