import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type CreateActivityLogInput = {
  businessId: string;
  actorUserId?: string | null;
  type:
    | "BUSINESS_CREATED"
    | "USER_CREATED"
    | "CLIENT_CREATED"
    | "CLIENT_ARCHIVED"
    | "INVOICE_CREATED"
    | "INVOICE_STATUS_CHANGED"
    | "RECURRING_TEMPLATE_CREATED"
    | "RECURRING_INVOICE_GENERATED"
    | "PAYMENT_RECORDED"
    | "STRIPE_PAYMENT_COMPLETED"
    | "STRIPE_PAYMENT_FAILED";
  title: string;
  message: string;
  metadata?: Prisma.JsonValue;
};

export async function writeActivityLog(input: CreateActivityLogInput) {
  if (!("activityLog" in db) || typeof db.activityLog?.create !== "function") {
    return null;
  }

  return db.activityLog.create({
    data: {
      businessId: input.businessId,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    },
  });
}
