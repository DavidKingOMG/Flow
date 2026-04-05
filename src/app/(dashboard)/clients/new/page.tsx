import { ClientForm } from "@/components/forms/client-form";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(14,23,38,0.96),rgba(8,11,20,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.36em] text-cyan-300/75">Client management</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Add client</h1>
          <p className="mt-4 text-base leading-7 text-[hsl(var(--dashboard-muted))]">
            Create a client record for contact-only tracking or enable a linked portal login in the same flow.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <ClientForm />
      </section>
    </div>
  );
}
