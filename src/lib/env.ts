import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url("AUTH_URL must be a valid URL"),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required"),
});

const devFallbackSchema = z.object({
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/flow"),
  AUTH_SECRET: z.string().default("flow-dev-auth-secret"),
  AUTH_URL: z.string().default("http://localhost:3000"),
  STRIPE_SECRET_KEY: z.string().default("sk_test_dev_placeholder"),
  STRIPE_WEBHOOK_SECRET: z.string().default("whsec_dev_placeholder"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().default("pk_test_dev_placeholder"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    if (process.env.NODE_ENV === "production") {
      cachedEnv = envSchema.parse(process.env);
    } else {
      cachedEnv = devFallbackSchema.parse(process.env);
    }
  }

  return cachedEnv;
}
