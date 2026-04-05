import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { AuthRequiredError, requireActiveBusiness } from "@/lib/business-context";

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  let context;

  try {
    context = await requireActiveBusiness();
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      redirect("/sign-in");
    }

    throw error;
  }

  const businessName = "Flow workspace";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(53,214,255,0.14),transparent_24%),linear-gradient(180deg,#040711_0%,#060b14_52%,#02040b_100%)] px-4 py-4 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Sidebar businessName={businessName} role={context.role} />

        <div className="flex min-h-full flex-col gap-4">
          <Topbar businessName={businessName} role={context.role} />
          <main className="flex-1 rounded-[2rem] border border-white/6 bg-white/[0.02] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
