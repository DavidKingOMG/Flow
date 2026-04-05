-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Role_businessId_id_key" ON "Role"("businessId", "id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_roleId_fkey" FOREIGN KEY ("businessId", "roleId") REFERENCES "Role"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
