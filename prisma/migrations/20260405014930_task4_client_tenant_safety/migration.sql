-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_userId_fkey";

-- DropIndex
DROP INDEX "Client_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Client_businessId_userId_key" ON "Client"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_businessId_id_key" ON "User"("businessId", "id");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_businessId_userId_fkey" FOREIGN KEY ("businessId", "userId") REFERENCES "User"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
