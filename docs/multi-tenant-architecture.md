# Multi-salon tenancy architecture

## Tenant boundary

Every salon is a first-class record in the `salons` collection with a unique, URL-safe `slug`. Public salon pages resolve the active salon by slug. Salon-owned records carry an immutable `salonId` value. Never accept a salon ID from a form body as proof of access.

## Membership and authorization

The `salonMemberships` collection is the source of truth for salon-scoped access. A membership is keyed by `salonId` and authenticated user identity and has one of `OWNER`, `ADMIN`, `MANAGER`, or `STAFF` roles. Membership status must be `ACTIVE` before access is granted. Platform-level administration is separate from salon membership.

Every salon-scoped API must:
1. Resolve the salon from a validated route slug.
2. Load the authenticated session where required.
3. Verify an active membership for that exact salon.
4. Apply the resolved salon ID to every database read, update, delete and aggregate.
5. Validate request bodies with a resource-specific Zod schema.
6. Write audit records in the same transaction as high-impact changes.

## Data model

- `salons`: name, slug, status, timezone, contact/profile data, owner metadata.
- `salonMemberships`: salonId, userId/email, role, status, invitedAt, joinedAt.
- `salonSettings`: one settings document per salonId.
- `services`, `staff`, `customers`, `appointments`, `payments`, `slotLocks`, `offers`, `reviews`, `notifications`, and `auditLogs`: all tenant-scoped by salonId.

## URL strategy

Use path-based tenant URLs (for example, `/salons/the-gentlemens-club-khulna`) so the product works on the existing Vercel domain without wildcard DNS. Salon management routes must retain the slug in the route, and tenant-aware API routes must resolve the same slug server-side.

## Legacy migration

The existing `SALON_ID` installation is a single-tenant legacy tenant. Migration must create its salon record, copy the legacy settings document to `salonSettings`, create owner/staff memberships, and preserve existing salonId values. Back up the production database before running any migration. Replace the legacy globally unique customer phone index with a unique compound index on `(salonId, phone)` only after checking for duplicate phone numbers within each tenant.

## Release gates

- Cross-tenant read/write isolation tests for every resource.
- Booking collision tests within a tenant and same-slot independence across different tenants.
- Role matrix tests for owner/admin/manager/staff/customer.
- Migration dry-run and backup/restore verification.
- Typecheck, unit/integration tests, lint and production build.
- Vercel preview smoke tests before merging to main.
