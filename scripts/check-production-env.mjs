const requiredVars = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "DEV_AUTH_BYPASS",
];

const placeholderHints = [
  "replace_me",
  "replace-with",
  "placeholder",
  "example.com",
  "localhost",
];

function fail(message) {
  console.error(`\n[deploy:check-env] ${message}`);
  process.exit(1);
}

for (const envVar of requiredVars) {
  const value = process.env[envVar];
  if (!value || value.trim().length === 0) {
    fail(`Missing required environment variable: ${envVar}`);
  }
}

const authUrl = process.env.AUTH_URL;
if (!authUrl.startsWith("https://")) {
  fail("AUTH_URL must use https in production.");
}

if (process.env.DEV_AUTH_BYPASS !== "0") {
  fail("DEV_AUTH_BYPASS must be set to \"0\" in production.");
}

for (const envVar of requiredVars) {
  const value = process.env[envVar] ?? "";
  const normalized = value.toLowerCase();

  if (placeholderHints.some((hint) => normalized.includes(hint))) {
    fail(`${envVar} appears to still use a placeholder value.`);
  }
}

if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
  fail("STRIPE_SECRET_KEY must be a valid Stripe secret key (sk_...).");
}

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_")) {
  fail("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a valid Stripe publishable key (pk_...).");
}

if (!process.env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
  fail("STRIPE_WEBHOOK_SECRET must be a valid Stripe webhook secret (whsec_...).");
}

console.log("[deploy:check-env] Production environment configuration looks valid.");
