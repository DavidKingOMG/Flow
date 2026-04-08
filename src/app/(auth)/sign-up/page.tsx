import { SignUpForm } from "@/components/forms/sign-up-form";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12 sm:px-8">
      <section className="w-full rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Create workspace</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Start Flow with your first admin account</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          Create a business workspace, set up the owner account, and land in the dashboard ready
          to invite the rest of your team.
        </p>

        <SignUpForm />
      </section>
    </main>
  );
}
