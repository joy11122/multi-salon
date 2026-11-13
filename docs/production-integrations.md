Production integrations runbook

This project includes provider adapters and salon-scoped administration for booking notices, workforce scheduling, Cloudinary media, Stripe refunds, shared rate limiting and operational monitoring.

## Configure environment variables
Copy the new entries from .env.example into Vercel Project Settings → Environment Variables. Never commit real credentials.

### Email
Create a Resend account, verify the sending domain, then set RESEND_API_KEY and RESEND_FROM_EMAIL. Set CONTACT_TO_EMAIL for website enquiries.

### SMS
Configure Twilio Messaging and an SMS-capable sender. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_SMS_FROM. Use E.164 numbers such as +8801XXXXXXXXX. Confirm Twilio geo-permissions and Bangladesh route support.

### WhatsApp
Enable WhatsApp Business messaging in Twilio and set TWILIO_WHATSAPP_FROM. For business-initiated notifications, create and approve a WhatsApp template in Twilio/Meta and set TWILIO_WHATSAPP_CONTENT_SID. The adapter sends booking text as template variable 1. The Twilio Sandbox is for development only and requires recipients to join it.

### Shared rate limiting
Create an Upstash Redis database and set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Production endpoints fail closed if shared rate limiting is unavailable; they do not silently fall back to per-instance memory.

### Image uploads
Create a Cloudinary cloud and set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET. Upload from /salons/{slug}/admin/media. Copy the returned secure URL into the service or staff imageUrl field. The API secret never reaches the browser.

### Refunds
Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET only if original payments are collected using Stripe. Register https://YOUR_DOMAIN/api/webhooks/stripe for refund.updated events. The payment record must contain providerPaymentIntentId. Cash, bank, bKash and Nagad refunds must be processed by their original provider and reconciled manually.

Important: this repository does not yet create Stripe PaymentIntents. Automatic refunds remain unavailable until Stripe checkout/payment collection is integrated and stores the PaymentIntent ID in each payment record.

### Monitoring and alerting
Set ALERT_WEBHOOK_URL to a trusted Slack/Teams-compatible incoming webhook or alert relay, and set a strong random HEALTHCHECK_TOKEN. Public liveness: GET /api/health. Detailed readiness: GET /api/health?details=1 with Authorization: Bearer HEALTHCHECK_TOKEN. Configure an external uptime monitor to poll every 1–5 minutes and alert on non-2xx responses. Salon admins can inspect events at /salons/{slug}/admin/monitoring.

## Staff schedules
Open /salons/{slug}/admin/shifts. Configure one weekly shift per staff member per weekday, add an optional break inside the shift, and record full-day or partial leave. Both availability lookup and booking creation enforce schedules and leave. Legacy staff with no schedule records continue using salon opening hours until a weekly schedule is configured.

## Booking notifications
After the booking transaction commits, the app attempts email, SMS and WhatsApp delivery. A provider outage does not undo a booking. Each delivery is recorded in notificationDeliveries as SENT, FAILED or SKIPPED_NOT_CONFIGURED. Delivery depends on provider approval, sender verification, recipient consent and country-specific routing rules.

## Database indexes
The booking API ensureIndexes routine now creates indexes for shifts, leave, notification delivery, refunds and monitoring. For deployments that do not execute booking before admin usage, run the project's index/seed setup during deployment or add these indexes through Atlas.

## Rollout checklist
- Configure provider secrets in Vercel.
- Verify sender domains and WhatsApp templates.
- Test SMS/WhatsApp with opted-in recipients.
- Upload a sample image and verify its Cloudinary URL.
- Configure staff shifts and test blocked time slots.
- Test Stripe refunds in test mode with a Stripe-created payment.
- Register the Stripe webhook and verify signature delivery.
- Confirm Upstash rate limiting works across instances.
- Configure uptime monitoring and alert webhook.
- Run typecheck, tests, lint and production build before merging.
