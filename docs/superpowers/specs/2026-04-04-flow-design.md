# Flow Design

## Summary

Flow is an admin-first business operating dashboard for small businesses that need client management, invoicing, recurring billing, payment tracking, and team access in one secure web app. The product should feel premium and operationally useful from day one, with a bold dark dashboard UI, clear workspace boundaries, and a lightweight client experience that supports the admin workflow rather than competing with it.

## Product Goals

- Give each new business a secure workspace created at signup.
- Make the admin dashboard the hero experience.
- Support both manual invoicing and recurring billing in the first release.
- Let businesses manage internal users and client records with or without login access.
- Support both manual payment recording and online payments.
- Present metrics, alerts, and recent activity in a polished dashboard.

## Non-Goals For V1

- Full accounting or bookkeeping workflows
- Regional tax compliance engines
- Multi-workspace switching for one user
- Internal messaging or chat
- Complex approval chains

## Users And Roles

### Business Admin

Created automatically when a business signs up. Admins control workspace settings, manage team members, create roles, manage clients, send invoices, configure recurring billing, review payments, and access analytics.

### Manager

Managers help run the business. They should be able to manage clients, invoices, recurring templates, and view most reporting, but they should not have the same control as admins over critical settings and top-level account controls.

### Staff

Staff members support day-to-day operations. They should have narrower access to client and invoice workflows depending on assigned permissions.

### Client

Clients can either exist as non-login customer records or as portal users with limited login access. A client login should allow invoice viewing, payment actions, and status tracking for their own records only.

## Core Experience

The first release centers on a premium dark admin dashboard inspired by modern SaaS analytics products. The main dashboard should surface:

- revenue summaries
- invoice status counts
- overdue and unpaid totals
- recurring schedule visibility
- recent payments
- recent client activity
- operational alerts and task-oriented callouts

The UI should feel intentional and high-end rather than generic. It should use strong cards, chart blocks, clear information hierarchy, and restrained accent colors on top of a dark interface.

## Architecture

Flow should be built as a single fullstack web app using:

- Next.js
- PostgreSQL
- Prisma
- Auth.js
- Stripe

This approach keeps the deployment story simple while still supporting real authentication, server-side authorization, background-capable billing logic, and secure payment handling.

The app should be organized into these major zones:

- public marketing and auth routes
- protected business dashboard routes
- admin modules for clients, invoices, payments, team, and analytics
- lightweight client-facing portal routes
- server-side domain logic for auth, permissions, billing, and activity logging

## Workspace And Data Boundaries

The top-level tenant object is `Business`. Every sensitive record belongs to a business so data isolation is enforced by design.

Primary entities for V1:

- `Business`
- `BusinessSettings`
- `User`
- `Role`
- `Client`
- `Invoice`
- `InvoiceLineItem`
- `RecurringInvoiceTemplate`
- `Payment`
- `ActivityLog`

### User Versus Client

`User` represents a login-capable actor. `Client` represents a customer record that receives invoices and business interactions. Some clients will be linked to a login user, while others remain non-login contacts. This distinction is required so businesses can invoice customers without forcing all clients into authentication flows.

## Functional Scope For V1

### Included

- business signup and initial admin creation
- secure login and session handling
- workspace-scoped role-based access
- team management for admin, manager, staff, and client roles
- client directory with login and non-login clients
- duplicate checks for username, email, and phone where applicable
- invoice creation, editing, sending, and status management
- invoice statuses including draft, sent, partial, paid, overdue, and canceled
- recurring invoice templates with scheduled invoice generation
- manual payment recording
- Stripe-based online payment flow
- dashboard analytics cards, charts, and recent activity
- lightweight client invoice access for login-enabled clients

### Excluded

- advanced accounting reports
- multi-currency complexity beyond a small initial settings model
- regional filing rules
- saved card vault management beyond Stripe-supported flows
- deep client collaboration tools

## Security Model

Every protected action must validate both:

1. The current user is authenticated.
2. The current user belongs to the active business and has permission for the requested action.

Security requirements:

- server-side authorization on all sensitive reads and writes
- business-scoped data access throughout the app
- duplicate identity checks during user and client creation flows
- safe handling for inactive records and non-login contacts
- verified Stripe webhook processing on the server
- activity logging for important business events

Key events to record in `ActivityLog`:

- business creation
- user invite or creation
- role assignment changes
- client creation or archival
- invoice creation and status transitions
- recurring invoice generation
- manual payment recording
- Stripe payment completion or failure

## Error Handling

The app should prefer explicit operational feedback over vague failures.

Examples:

- Duplicate username, email, or phone should surface a clear conflict message.
- Failed recurring invoice generation should be logged and visible to admins.
- Payment state should remain safe until Stripe webhook confirmation is received.
- Unauthorized actions should fail cleanly without leaking data across businesses.

## Testing Strategy

Testing should prioritize the highest-risk business logic first.

Priority areas:

- authentication and session rules
- business isolation
- role-based permissions
- invoice totals and status transitions
- recurring invoice generation
- payment recording
- Stripe webhook verification
- duplicate identity validation

## Recommended Build Order

1. App shell, auth, database schema, and business creation flow
2. Role system and protected dashboard shell
3. Client management
4. Invoice CRUD and status workflows
5. Recurring invoice templates and generation logic
6. Manual payments and Stripe payments
7. Dashboard analytics and activity log
8. Client-facing invoice access

## Product Naming

The product name for the app is `Flow`.
