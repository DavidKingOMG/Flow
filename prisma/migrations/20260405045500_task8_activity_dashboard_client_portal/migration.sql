-- CreateEnum
CREATE TYPE "ActivityLogType" AS ENUM (
    'BUSINESS_CREATED',
    'USER_CREATED',
    'CLIENT_CREATED',
    'CLIENT_ARCHIVED',
    'INVOICE_CREATED',
    'INVOICE_STATUS_CHANGED',
    'RECURRING_TEMPLATE_CREATED',
    'RECURRING_INVOICE_GENERATED',
    'PAYMENT_RECORDED',
    'STRIPE_PAYMENT_COMPLETED',
    'STRIPE_PAYMENT_FAILED'
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "ActivityLogType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_businessId_createdAt_idx" ON "ActivityLog"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_businessId_type_createdAt_idx" ON "ActivityLog"("businessId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
