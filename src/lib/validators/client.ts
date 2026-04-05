import { z } from "zod";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeUsername(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .regex(
    /^[a-z0-9-_.]+$/i,
    "Username can only use letters, numbers, dashes, underscores, and periods",
  );

const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((value) => normalizePhone(value))
  .refine((value) => value.length >= 7, "Phone number must include at least 7 digits");

export const createClientSchema = z
  .object({
    fullName: z.string().trim().min(2, "Client name is required"),
    companyName: z.string().trim().optional(),
    email: z.string().trim().email("A valid email is required").transform((value) => normalizeEmail(value)),
    phone: phoneSchema,
    notes: z.string().trim().optional(),
    loginEnabled: z.boolean().default(false),
    username: z.string().trim().optional().transform((value) => normalizeUsername(value)),
    password: z.string().optional(),
  })
  .superRefine((input, context) => {
    if (!input.loginEnabled) {
      return;
    }

    const usernameResult = usernameSchema.safeParse(input.username ?? "");
    if (!usernameResult.success) {
      for (const issue of usernameResult.error.issues) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["username"],
          message: issue.message,
        });
      }
    }

    if (!input.password || input.password.length < 8) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must be at least 8 characters",
      });
    }
  });

export type CreateClientInput = z.input<typeof createClientSchema>;
export type CreateClientData = z.output<typeof createClientSchema>;
