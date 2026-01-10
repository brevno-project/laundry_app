# Vercel Environment Variables Setup

## Required Environment Variables

To fix the 401 authentication errors, you need to add the following environment variable in Vercel:

### 1. SUPABASE_URL (Recommended)

While the app can work with `NEXT_PUBLIC_SUPABASE_URL`, it's better to add a dedicated server-side variable:

**Variable Name:** `SUPABASE_URL`  
**Value:** Your Supabase project URL (same as `NEXT_PUBLIC_SUPABASE_URL`)  
**Example:** `https://your-project.supabase.co`

### How to Add in Vercel:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add new variable:
   - **Key:** `SUPABASE_URL`
   - **Value:** Your Supabase project URL
   - **Environments:** Select all (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** your project for changes to take effect

### Current Environment Variables (Required):

```
✅ NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
✅ SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
✅ TELEGRAM_BOT_TOKEN=your-bot-token
✅ TELEGRAM_WEBHOOK_SECRET=laundry_webhook_secret_key_2025
✅ ADMIN_EMAIL=student-622ddda2@example.com
✅ ADMIN_PASSWORD=your-admin-password

🆕 SUPABASE_URL=https://your-project.supabase.co  (ADD THIS)
```

## Why This Fixes the 401 Error

The server-side Supabase client (used in API routes) was trying to use `process.env.SUPABASE_URL`, which didn't exist. The code now:

1. **Tries `SUPABASE_URL` first** (server-side variable)
2. **Falls back to `NEXT_PUBLIC_SUPABASE_URL`** if not found
3. **Throws clear error** if both are missing

This ensures the admin API routes can properly authenticate JWT tokens.

## After Adding Variable

1. Redeploy the project in Vercel
2. Test admin functions (ban, unban, edit student, etc.)
3. Check that 401 errors are resolved

## Troubleshooting

If you still get 401 errors after adding the variable:

1. **Verify the variable is set** in Vercel Settings
2. **Redeploy** the project (variables only apply after deployment)
3. **Check the error details** - now includes `details` field with specific error message
4. **Verify JWT token** is being sent correctly from frontend
