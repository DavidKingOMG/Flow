-- CreateEnum
CREATE TYPE "RecurringTemplateStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "RecurringGenerationOutcome" AS ENUM ('CREATED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "RecurringInvoiceStatus" AS ENUM ('DRAFT', 'SENT');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "recurringTemplateId" TEXT,
ADD COLUMN     "recurringWindowStart" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RecurringInvoiceTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecurringTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" "RecurringFrequency" NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "dueInDays" INTEGER NOT NULL DEFAULT 0,
    "invoiceStatus" "RecurringInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "taxRateBps" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastGeneratedAt" TIMESTAMP(3),
    "lastGeneratedInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringInvoiceTemplateLineItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoiceTemplateLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringInvoiceGeneration" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "outcome" "RecurringGenerationOutcome" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringInvoiceGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringInvoiceTemplate_businessId_status_nextRunAt_idx" ON "RecurringInvoiceTemplate"("businessId", "status", "nextRunAt");

-- CreateIndex
CREATE INDEX "RecurringInvoiceTemplate_businessId_clientId_idx" ON "RecurringInvoiceTemplate"("businessId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringInvoiceTemplate_businessId_id_key" ON "RecurringInvoiceTemplate"("businessId", "id");

-- CreateIndex
CREATE INDEX "RecurringInvoiceTemplateLineItem_templateId_sortOrder_idx" ON "RecurringInvoiceTemplateLineItem"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "RecurringInvoiceGeneration_businessId_createdAt_idx" ON "RecurringInvoiceGeneration"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "RecurringInvoiceGeneration_templateId_scheduledFor_idx" ON "RecurringInvoiceGeneration"("templateId", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_recurringTemplateId_recurringWindowStart_key" ON "Invoice"("recurringTemplateId", "recurringWindowStart");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessId_recurringTemplateId_fkey" FOREIGN KEY ("businessId", "recurringTemplateId") REFERENCES "RecurringInvoiceTemplate"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceTemplate" ADD CONSTRAINT "RecurringInvoiceTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceTemplate" ADD CONSTRAINT "RecurringInvoiceTemplate_businessId_clientId_fkey" FOREIGN KEY ("businessId", "clientId") REFERENCES "Client"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceTemplateLineItem" ADD CONSTRAINT "RecurringInvoiceTemplateLineItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RecurringInvoiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceGeneration" ADD CONSTRAINT "RecurringInvoiceGeneration_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceGeneration" ADD CONSTRAINT "RecurringInvoiceGeneration_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RecurringInvoiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceGeneration" ADD CONSTRAINT "RecurringInvoiceGeneration_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
