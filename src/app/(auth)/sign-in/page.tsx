import { signInWithCredentialsAction } from "@/server/actions/auth-actions";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12 sm:px-8">
      <section className="w-full rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Flow access</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Sign in to your business workspace</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
          Use your email or username and password to open the Flow dashboard for your team.
        </p>

        <form action={signInWithCredentialsAction} className="mt-10 grid gap-5">
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

          <button
            type="submit"
            className="mt-4 rounded-full bg-cyan-300 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-200"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
