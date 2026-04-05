process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/flow";
process.env.AUTH_SECRET ??= "test-auth-secret";
process.env.AUTH_URL ??= "http://localhost:3000";
process.env.STRIPE_SECRET_KEY ??= "sk_test_replace_me";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_replace_me";
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= "pk_test_replace_me";

import "@testing-library/jest-dom/vitest";
