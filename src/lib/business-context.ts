import type { AppRole } from "@/lib/permissions";
import { db } from "@/lib/db";

export class AuthRequiredError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class TenantAccessError extends Error {
  constructor(message = "You cannot access records from another business.") {
    super(message);
    this.name = "TenantAccessError";
  }
}

export type SessionBusinessUser = {
  id?: string | null;
  businessId?: string | null;
  activeBusinessId?: string | null;
  role?: AppRole | null;
};

export type SessionLike = {
  user?: SessionBusinessUser | null;
} | null;

export type ActiveBusinessContext = {
  userId: string;
  businessId: string;
  activeBusinessId: string;
  role: AppRole;
};

export function assertBusinessAccess({
  activeBusinessId,
  resourceBusinessId,
}: {
  activeBusinessId: string;
  resourceBusinessId: string;
}): void {
  if (activeBusinessId !== resourceBusinessId) {
    throw new TenantAccessError();
  }
}

export function resolveActiveBusiness(session: SessionLike): ActiveBusinessContext {
  const user = session?.user;

  if (!user?.id || !user.businessId || !user.activeBusinessId || !user.role) {
    throw new AuthRequiredError();
  }

  assertBusinessAccess({
    activeBusinessId: user.activeBusinessId,
    resourceBusinessId: user.businessId,
  });

  return {
    userId: user.id,
    businessId: user.businessId,
    activeBusinessId: user.activeBusinessId,
    role: user.role,
  };
}

export async function revalidateActiveBusinessSession(
  session: SessionLike,
): Promise<ActiveBusinessContext> {
  const userId = session?.user?.id;

  if (!userId) {
    throw new AuthRequiredError();
  }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      business: true,
      role: true,
    },
  });

  if (!user || !user.business || !user.role) {
    throw new AuthRequiredError();
  }

  if (user.status !== "ACTIVE" || user.business.status !== "ACTIVE") {
    throw new AuthRequiredError();
  }

  if (user.role.businessId !== user.businessId) {
    throw new AuthRequiredError();
  }

  const activeBusinessId = user.activeBusinessId ?? user.businessId;

  assertBusinessAccess({
    activeBusinessId,
    resourceBusinessId: user.businessId,
  });

  return {
    userId: user.id,
    businessId: user.businessId,
    activeBusinessId,
    role: user.role.key,
  };
}

export function ensureBusinessAccess(
  session: SessionLike,
  resourceBusinessId: string,
): ActiveBusinessContext {
  const context = resolveActiveBusiness(session);

  assertBusinessAccess({
    activeBusinessId: context.activeBusinessId,
    resourceBusinessId,
  });

  return context;
}

function isDevAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS !== "0";
}

export async function requireActiveBusiness(): Promise<ActiveBusinessContext> {
  if (isDevAuthBypassEnabled()) {
    return {
      userId: "dev-user",
      businessId: "dev-business",
      activeBusinessId: "dev-business",
      role: "ADMIN",
    };
  }

  const { auth } = await import("@/lib/auth");

  return revalidateActiveBusinessSession(await auth());
}
