"use client";

import { useActionState } from "react";
import { signInWithCredentialsAction } from "@/server/actions/auth-actions";

const initialAuthActionState = {
  status: "idle" as const,
  error: null as string | null,
};

export function SignInForm() {
  const [state, formAction, pending] = useActionState(
    signInWithCredentialsAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="mt-10 grid gap-5">
      <label className="grid gap-2 text-sm text-slate-200">
        Email or username
        <input
          name="identifier"
          type="text"
          autoComplete="username"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
          placeholder="jamie@example.com"
          required
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-200">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/50"
          placeholder="Enter your password"
          required
        />
      </label>

      {state.status === "error" && state.error ? (
        <div className="rounded-[1.5rem] border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-full bg-cyan-300 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
