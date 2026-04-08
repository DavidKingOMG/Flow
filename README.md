# Flow

Flow is a secure, admin-first business dashboard for multi-client operations:

- business account + admin bootstrap
- role-based team access (`ADMIN`, `MANAGER`, `STAFF`, `CLIENT`)
- clients with login-enabled and non-login profiles
- invoice + recurring billing workflows
- payment tracking + Stripe webhook handling
- premium dark dashboard UI

## Local Setup

1. Install dependencies:
   - `npm install`
2. Copy environment config and fill values:
   - copy `.env.example` to `.env`
3. Run Prisma migrations:
   - `npm run db:migrate:dev -- --name init`
4. Start development server:
   - `npm run dev`

## Verification

- Unit/integration tests: `npm test`
- E2E tests: `npm run test:e2e`
- Lint: `npm run lint`
- Release verification: `npm run verify`
- Pre-deploy env validation: `npm run deploy:check-env`
- Full deployment gate: `npm run deploy:ready`
- Health check: `GET /api/health`

## CI

GitHub Actions runs lint, tests, and production build on pushes/PRs:

- [ci.yml](.github/workflows/ci.yml)

## Deployment

Deployment guide is in [docs/deployment.md](docs/deployment.md).
