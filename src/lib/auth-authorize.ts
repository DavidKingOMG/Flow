import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const credentialSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function authorizeCredentials(rawCredentials: unknown) {
  const parsed = credentialSchema.safeParse(rawCredentials);

  if (!parsed.success) {
    return null;
  }

  const identifier = parsed.data.identifier.trim().toLowerCase();
  const user = await db.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
    include: {
      business: true,
      role: true,
    },
  });

  if (!user || !user.role || !user.business) {
    return null;
  }

  if (user.status !== "ACTIVE" || user.business.status !== "ACTIVE") {
    return null;
  }

  if (user.role.businessId !== user.businessId) {
    return null;
  }

  if (!verifyPassword(parsed.data.password, user.passwordHash)) {
    return null;
  }

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastSignedInAt: new Date(),
    },
  });

  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    image: user.image,
    businessId: user.businessId,
    activeBusinessId: user.activeBusinessId ?? user.businessId,
    role: user.role.key,
  };
}
