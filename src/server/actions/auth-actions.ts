"use server";

import { Prisma } from "@prisma/client";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const businessSignupSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required"),
  fullName: z.string().trim().min(2, "Full name is required"),
  email: z.string().trim().email("A valid email is required"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-z0-9-_.]+$/i, "Username can only use letters, numbers, dashes, underscores, and periods"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().min(7, "Phone number is required"),
  currencyCode: z.string().trim().length(3).optional(),
  timezone: z.string().trim().min(1).optional(),
});

const credentialActionSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type BusinessSignupInput = z.input<typeof businessSignupSchema>;
export type BusinessSignupResult = Awaited<ReturnType<typeof createBusinessAccount>>;
export type AuthActionState = {
  status: "idle" | "error";
  error: string | null;
};

const initialAuthActionState: AuthActionState = {
  status: "idle",
  error: null,
};

function slugifyBusinessName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function readFormDataEntry(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function rethrowRedirect(error: unknown): never | void {
  if (isRedirectError(error)) {
    throw error;
  }
}

export async function createBusinessAccount(rawInput: BusinessSignupInput) {
  const input = businessSignupSchema.parse(rawInput);
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  const phone = normalizePhone(input.phone);
  const passwordHash = hashPassword(input.password);
  const slug = slugifyBusinessName(input.businessName);
  const currencyCode = (input.currencyCode ?? "USD").toUpperCase();
  const timezone = input.timezone ?? "America/New_York";

  try {
    return await db.$transaction(async (transaction) => {
      const business = await transaction.business.create({
        data: {
          name: input.businessName.trim(),
          slug,
        },
      });

      const adminRole = await transaction.role.create({
        data: {
          businessId: business.id,
          key: "ADMIN",
          name: "Admin",
          description: "Workspace owner with full business access.",
          isSystem: true,
        },
      });

      const user = await transaction.user.create({
        data: {
          businessId: business.id,
          activeBusinessId: business.id,
          roleId: adminRole.id,
          fullName: input.fullName.trim(),
          email,
          username,
          phone,
          passwordHash,
        },
        include: {
          role: true,
        },
      });

      const settings = await transaction.businessSettings.create({
        data: {
          businessId: business.id,
          currencyCode,
          timezone,
        },
      });

      await transaction.activityLog?.createMany?.({
        data: [
          {
            businessId: business.id,
            actorUserId: user.id,
            type: "BUSINESS_CREATED",
            title: "Business workspace created",
            message: `${business.name} is now active with its first admin account.`,
          },
          {
            businessId: business.id,
            actorUserId: user.id,
            type: "USER_CREATED",
            title: "Initial admin provisioned",
            message: `${user.fullName} was created as the initial admin user.`,
          },
        ],
      });

      return {
        business,
        user,
        settings,
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("A business account with those details already exists.");
    }

    throw error;
  }
}

export async function createBusinessAccountAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const input = {
    businessName: readFormDataEntry(formData, "businessName"),
    fullName: readFormDataEntry(formData, "fullName"),
    email: readFormDataEntry(formData, "email"),
    username: readFormDataEntry(formData, "username"),
    password: readFormDataEntry(formData, "password"),
    phone: readFormDataEntry(formData, "phone"),
  };

  const parsed = businessSignupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Please correct the highlighted fields.",
    };
  }

  let result;

  try {
    result = await createBusinessAccount(parsed.data);
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unable to create your business account.",
    };
  }

  try {
    const { signIn } = await import("@/lib/auth");

    await signIn("credentials", {
      identifier: result.user.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    rethrowRedirect(error);

    return {
      status: "error",
      error: "Your account was created, but automatic sign-in failed. Please sign in manually.",
    };
  }

  return initialAuthActionState;
}

export async function signInWithCredentialsAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialActionSchema.safeParse({
    identifier: readFormDataEntry(formData, "identifier"),
    password: readFormDataEntry(formData, "password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Please provide valid sign-in credentials.",
    };
  }

  const { signIn } = await import("@/lib/auth");
  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    rethrowRedirect(error);
    return {
      status: "error",
      error: "Sign-in failed. Check your email/username and password.",
    };
  }

  return initialAuthActionState;
}
