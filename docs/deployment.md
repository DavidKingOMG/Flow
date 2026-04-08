# Flow Deployment (Vercel + PostgreSQL + Stripe)

This runbook keeps Flow publicly accessible, secure, and simple to operate.

## 1. Production Environment Variables

Set these in your hosting provider:

- `DATABASE_URL` (managed PostgreSQL URL)
- `AUTH_SECRET` (long random secret)
- `AUTH_URL` (public app URL, e.g. `https://your-domain.com`)
- `STRIPE_SECRET_KEY` (live or test key based on environment)
- `STRIPE_WEBHOOK_SECRET` (from Stripe webhook endpoint)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `DEV_AUTH_BYPASS=0` (must stay off outside local dev)

## 2. Database Migration Flow

Before each release:

1. Generate Prisma artifacts:
   - `npm run db:generate`
2. Apply committed migrations in production:
   - `npm run db:migrate:deploy`

## 3. Deploy App

Recommended target: Vercel.

1. Import repository in Vercel.
2. Configure all environment variables above.
3. Use default install command (`npm install`).
4. Use build command:
   - `npm run build`
5. Deploy.

`npm run build` already runs `prisma generate` first.

## 4. Stripe Webhook

Create webhook endpoint in Stripe:

- URL: `https://your-domain.com/api/stripe/webhook`
- Events: include checkout/payment completion and failure events used by Flow.
- Paste the webhook secret into `STRIPE_WEBHOOK_SECRET`.

## 5. Release Checklist

Run before shipping:

1. `npm run verify`
2. `npm run test:e2e`
3. `npm run db:migrate:deploy` (production environment)
4. Verify sign-up/sign-in, invoice creation, and payment status updates in live app.

## 6. Operational Health Check

Flow exposes a readiness endpoint:

- `GET /api/health`

Expected responses:

- `200` with `{ ok: true }` when DB connectivity is healthy
- `503` with `{ ok: false }` when DB connectivity fails
