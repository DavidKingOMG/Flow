import type { AppRole } from "@/lib/permissions";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      businessId: string;
      activeBusinessId: string;
      role: AppRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    businessId?: string;
    activeBusinessId?: string;
    role?: AppRole;
  }
}
