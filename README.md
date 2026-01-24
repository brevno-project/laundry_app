# Laundry App

A dorm laundry queue and cleanup management system. Students register from a pre-created roster, join the queue, and receive updates in real time. Admins manage the laundry flow. Leaders (cleanup admins) manage cleanup results and student records. Coupons are issued from cleanup results or manually by super admins.

## Features

- Student roster-based login and registration
- Live laundry queue with real-time updates
- Admin controls for washing flow
- Cleanup schedules and result publishing
- Coupon issuance, reservation, transfer, and expiration
- Telegram integration for notifications
- Avatars, profiles, and key status tracking
- Multi-language UI (ru/en/ko/ky) and dark mode

## Roles

- Student: join/leave queue, manage profile
- Admin: manage laundry queue and statuses
- Leader (cleanup admin): manage cleanup results and students
- Super admin: full access, including coupon grants

## Tech Stack

- Next.js
- Supabase (Postgres, Auth, Realtime)
- Tailwind CSS

## Environment Variables

Create `.env.local` for local dev and configure the same in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BASE_URL=
NEXT_PUBLIC_BOT_USERNAME=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ADMIN_CHAT_ID=
CRON_SECRET=
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` is required for server-side admin actions.
- `NEXT_PUBLIC_BASE_URL` is required for Telegram webhook callbacks.
- `NEXT_PUBLIC_BOT_USERNAME` is used in the UI (optional but recommended).
- `TELEGRAM_ADMIN_CHAT_ID` is optional; if set, it receives admin notifications.
- `CRON_SECRET` is only needed if you use the cron reminder endpoint.

## Supabase Setup

1. Create a Supabase project and set the environment variables.
2. Apply migrations from `supabase/migrations`.
   - With CLI: `supabase db push`
   - Or run the SQL in the Supabase SQL editor.
3. Enable Realtime for the tables you want live updates on (queue, students, machine_state, history, cleanup_schedules, coupons).

## Local Development

```
npm install
npm run dev
```

Open http://localhost:3000

## Deployment

- Deploy to Vercel and set the same environment variables.
- If Telegram is used, set the webhook secret and base URL.

## Operations

- Coupon TTL is controlled by `app_settings.cleanup_coupon_ttl_seconds` (default 7 days).
- Admin routes require JWT auth and role checks.

## License

MIT
