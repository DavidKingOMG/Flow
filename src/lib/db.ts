import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __flowPrisma__: PrismaClient | undefined;
}

export const db =
  globalThis.__flowPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__flowPrisma__ = db;
}
