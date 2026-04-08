import { createBusinessAccountAction } from "@/server/actions/auth-actions";

export default function SignUpPage() {
  async function submitBusinessSignup(formData: FormData): Promise<void> {
    "use server";
    await createBusinessAccountAction(formData);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12 sm:px-8">
      <section className="w-full rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Create workspace</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Start Flow with your first admin account</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          Create a business workspace, set up the owner account, and land in the dashboard ready
          to invite the rest of your team.
        </p>

        <form action={submitBusinessSignup} className="mt-10 grid gap-5 md:grid-cols-2">
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

          <button
            type="submit"
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200 md:col-span-2"
          >
            Create business account
          </button>
        </form>
      </section>
    </main>
  );
}
