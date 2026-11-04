# The Gentlemen's Club

Luxury men's grooming website and salon operations foundation for Khulna, Bangladesh.

## Product scope

- Public website: Home, About, Services, Barbers, Gallery, Booking and Contact.
- Multi-salon directory and independent public profiles at `/salons` and `/salons/[slug]`.
- Authenticated salon onboarding at `/dashboard/salons`; each owner gets a salon-scoped management workspace at `/salons/[slug]/admin`.
- Tenant-scoped services, staff, customers, appointments, payments, settings and audit records; membership roles are OWNER, ADMIN, MANAGER and STAFF.
- Guest booking: service → barber/any available → date/time → customer details → booking reference.
- Availability in `Asia/Dhaka`; appointments are stored as UTC dates.
- Transactional booking creation with 15-minute unique slot locks to prevent concurrent overlapping appointments for the same barber.
- Authentication: Google OAuth (optional) and email/password, plus guest booking.
- Role-aware admin and staff workspaces; admin email allowlist via `ADMIN_EMAILS`.
- Admin tools: appointments, services, staff, customers, payments, notifications, offers, reviews, reports and salon opening hours/profile.
- API validation with Zod, password hashing with bcrypt, rate limiting, audit logs and security headers.
- Vitest tests for booking validation and timezone/reference helpers.

## Technology

Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, NextAuth/Auth.js, MongoDB Atlas native driver, Zod, bcryptjs, Lucide and Vitest.

## Requirements

- Node.js 20+
- npm 10+
- MongoDB Atlas database. The booking transaction flow requires a replica-set deployment; MongoDB Atlas provides this by default.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Set at least `MONGODB_URI`, `AUTH_SECRET`, and `ADMIN_EMAILS` in `.env.local`. Configure Google OAuth credentials if Google sign-in is required. Set `NEXT_PUBLIC_APP_URL` to the correct origin. `SALON_ID`, `SALON_SLUG` and `SALON_NAME` identify the legacy Gentlemen's Club tenant during migration.

Seed initial sample services and default opening hours:

```bash
npm run db:seed
```

The seed inserts sample services and provisional 10:00–20:00 opening hours. These values are examples, not verified salon information. Sign in with an address in `ADMIN_EMAILS`, then:

1. Open `/admin/settings` and confirm the actual salon name, address, phone and opening hours.
2. Open `/admin/services` and confirm/edit the service menu, prices and durations.
3. Open `/admin/staff` and add real barbers with their name, email and phone. Adding staff creates a STAFF role record for that email; the staff member signs in using Google OAuth with the same email.
4. Test a guest booking from `/booking` and confirm it appears in `/admin/appointments`.

Start development:

```bash
npm run dev
```

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Multi-tenant platform

- Sign in and open `/dashboard/salons` to create a new salon workspace. The creator receives an OWNER membership for that salon.
- Public salon profiles use `/salons/{slug}` and booking uses `/salons/{slug}/booking`.
- Salon administration uses `/salons/{slug}/admin`; every resource API receives the same `salonSlug` and verifies an active membership for that exact salon before reading or changing data.
- Salon-owned records are scoped by `salonId`. Customer phone uniqueness is scoped to `(salonId, phone)`, so the same person may be a customer of multiple salons.
- The original `/admin` workspace remains the legacy single-salon administration route for the existing `SALON_ID`. New salons must use their slug-scoped workspace.
- The existing production database must be migrated before the legacy salon appears in the public directory or its new slug-scoped workspace works. Take a verified backup, configure `SALON_ID`, `SALON_SLUG`, `SALON_NAME` and `ADMIN_EMAILS`, then run `npm run db:migrate:multi-tenant` for a dry run. Review the document counts and duplicate phone report. Only after the backup and review, run `node scripts/migrate-multi-tenant.mjs --apply` against the intended database. This migration assigns legacy records missing `salonId` to the legacy salon, copies settings, creates owner/staff memberships and replaces the global customer phone index. Never run `--apply` against a database containing unrelated applications or unreviewed tenant data.

## Booking consistency design

The server validates every booking request, calculates its UTC start/end from the requested Dhaka wall-clock time, and attempts a MongoDB transaction. It inserts one unique lock per 15-minute interval for the selected barber. A unique compound index on `(salonId, staffId, slotKey)` makes competing overlapping bookings conflict even when they begin at different times. The appointment and locks commit together. Cancellation/rejection releases the locks. Atlas transactions and index creation are required for this guarantee.

## Roles and authentication

- Guest: can submit a booking request without an account.
- Customer: can authenticate, see booking history on `/dashboard`, and book again. Use the account email when booking to associate the visit with the account.
- Staff: can view and update assigned appointments. Create staff records in Admin first, then the staff member signs in with Google using the matching email.
- Admin: emails listed in `ADMIN_EMAILS` receive the ADMIN role. Protect this environment variable and only list trusted administrators.

Email/password registration uses bcrypt hashing. Google OAuth is enabled only when both Google environment variables are configured. Staff Google sign-in requires a matching staff email.

## Integrations and launch configuration

- Contact form delivery requires `RESEND_API_KEY`, `CONTACT_TO_EMAIL` and a verified `RESEND_FROM_EMAIL`.
- Online payment collection is intentionally not enabled. Admin can record offline payments (cash/card/mobile banking/bank transfer).
- Cloudinary variables are not required by the current implementation; gallery images are illustrative remote images.
- Contact details, staff profiles, final prices, opening hours and salon photography must be confirmed before launch.
- `NEXT_PUBLIC_APP_URL` must be set to the real production domain; sitemap, robots and Open Graph metadata use it.

## Deployment (Vercel)

1. Push the project to a GitHub repository with `main` as the production branch.
2. Import the repository into Vercel and select the Next.js framework preset.
3. Add all required environment variables to Preview and Production environments.
4. Set `NEXT_PUBLIC_APP_URL` and `AUTH_URL` to the production URL.
5. Add the production callback URL to Google OAuth, for example `https://YOUR_DOMAIN/api/auth/callback/google`.
6. Deploy, run the seed script against the production database from a trusted environment, then complete the salon setup checklist.
7. Back up the database and apply the reviewed multi-tenant migration.
8. Verify each salon owner can access only their own workspace; test two salons with the same customer phone and overlapping staff time slots.
9. Verify booking, cancellation, staff access, contact delivery and admin role separation before opening public bookings.

## Operational/security notes

- The included in-memory rate limiter is a single-process fallback. For horizontally scaled production deployments, replace it with a shared Redis/Vercel KV limiter.
- Audit logs are written for admin/staff record updates. Database backups, monitoring and alerting should be configured in MongoDB Atlas/Vercel.
- No real payment processor, SMS/WhatsApp delivery, email booking confirmation, staff shift calendar, image upload, or automated refund integration is enabled yet.
- The demo service prices and opening hours are not verified. Do not advertise them until the owner approves them.
- Do not commit `.env.local` or any credentials.
