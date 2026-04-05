import { canManageBilling } from "@/lib/permissions";
import type { ActiveBusinessContext } from "@/lib/business-context";

export class BillingAccessError extends Error {
  constructor(message = "Billing access requires at least manager permissions.") {
    super(message);
    this.name = "BillingAccessError";
  }
}

export function assertBillingAccess(context: Pick<ActiveBusinessContext, "role">) {
  if (!canManageBilling(context.role)) {
    throw new BillingAccessError();
  }
}
