-- Add the nullable roleId first so existing users can be backfilled safely.
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

-- Ensure every existing business/role combination has a matching Role row.
INSERT INTO "Role" ("id", "businessId", "key", "name", "description", "isSystem", "createdAt", "updatedAt")
SELECT
  'role_' || md5("User"."businessId" || ':' || "User"."role"::text),
  "User"."businessId",
  "User"."role",
  CASE "User"."role"
    WHEN 'ADMIN' THEN 'Admin'
    WHEN 'MANAGER' THEN 'Manager'
    WHEN 'STAFF' THEN 'Staff'
    WHEN 'CLIENT' THEN 'Client'
  END,
  CASE "User"."role"
    WHEN 'ADMIN' THEN 'Workspace owner with full business access.'
    WHEN 'MANAGER' THEN 'Workspace manager with operational access.'
    WHEN 'STAFF' THEN 'Workspace staff member with limited access.'
    WHEN 'CLIENT' THEN 'Client user with portal-only access.'
  END,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("businessId", "key") DO NOTHING;

-- Backfill existing users to their matching scoped role record.
UPDATE "User"
SET "roleId" = "Role"."id"
FROM "Role"
WHERE "Role"."businessId" = "User"."businessId"
  AND "Role"."key" = "User"."role"
  AND "User"."roleId" IS NULL;

-- Once backfilled, enforce the new relation and remove the legacy enum column.
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

DROP INDEX "User_businessId_role_idx";

ALTER TABLE "User" DROP COLUMN "role";

CREATE INDEX "User_roleId_idx" ON "User"("roleId");

CREATE INDEX "User_businessId_roleId_idx" ON "User"("businessId", "roleId");

ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
