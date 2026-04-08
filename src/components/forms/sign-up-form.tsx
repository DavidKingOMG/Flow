"use client";

import { useActionState } from "react";
import { createBusinessAccountAction } from "@/server/actions/auth-actions";

const initialAuthActionState = {
  status: "idle" as const,
  error: null as string | null,
};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(
    createBusinessAccountAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="mt-10 grid gap-5 md:grid-cols-2">
      <label className="grid gap-2 text-sm text-slate-200 md:col-span-2">
        Business name
        <input
          name="businessName"
          type="text"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
          placeholder="Northwind Studio"
          required
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-200">
        Full name
        <input
          name="fullName"
          type="text"
          autoComplete="name"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
          placeholder="Jamie Lee"
          required
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-200">
        Phone
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
          placeholder="5551234567"
          required
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-200">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
          placeholder="jamie@example.com"
          required
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-200">
        Username
        <input
          name="username"
          type="text"
          autoComplete="username"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
          placeholder="jamie-admin"
          required
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-200 md:col-span-2">
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
          placeholder="Choose a secure password"
          required
        />
      </label>

      {state.status === "error" && state.error ? (
        <div className="rounded-[1.5rem] border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100 md:col-span-2">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
      >
        {pending ? "Creating account..." : "Create business account"}
      </button>
    </form>
  );
}
