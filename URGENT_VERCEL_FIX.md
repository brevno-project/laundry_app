# 🚨 URGENT: Vercel Dashboard Manual Fix Required

## Current Status

✅ **Code is correct and deployed:**
- Commit `dc9ec73`: "Add Vercel deployment configuration files"
- Commit `395b31b`: "Fix 401 errors in admin API routes"
- All changes pushed to `origin/main`

❌ **API Routes still return 404:**
```
POST /api/admin/queue/update-details → 404
POST /api/admin/queue/set-status → 404
POST /api/admin/queue/start-washing → 404
POST /api/admin/queue/mark-done → 404
POST /api/admin/queue/remove → 404
```

## Root Cause

Vercel is **ignoring** the `vercel.json` configuration and still deploying as **static export**. This happens when:

1. **Vercel Dashboard settings override** `vercel.json`
2. **Build settings are cached** from previous deployment
3. **Framework detection failed** and defaulted to static

## 🔧 IMMEDIATE ACTION REQUIRED

### Step 1: Open Vercel Dashboard

Go to: https://vercel.com/your-username/laundryapp-one

### Step 2: Check Settings → General

**Current (WRONG) settings might be:**
- ❌ Output Directory: `out`
- ❌ Build Command: `next build && next export`
- ❌ Framework: Other/Static

**Required (CORRECT) settings:**
- ✅ Framework Preset: **Next.js**
- ✅ Build Command: **`next build`** (or leave empty)
- ✅ Output Directory: **empty** (or `.next`)
- ✅ Install Command: **`npm install`** (or leave empty)

### Step 3: Check Functions Tab

1. Open **Functions** tab in your project
2. **If you see functions** → Settings are correct, skip to Step 5
3. **If Functions is empty** → Continue to Step 4

### Step 4: Fix Settings

1. **Settings** → **General**
2. Scroll to **Build & Development Settings**
3. Click **Edit** next to each setting:
   - **Framework Preset:** Select "Next.js" from dropdown
   - **Build Command:** Change to `next build` or clear it
   - **Output Directory:** Clear this field completely
4. Click **Save** for each change

### Step 5: Force Redeploy

**Option A: Redeploy from Dashboard**
1. Go to **Deployments** tab
2. Find the latest deployment (dc9ec73)
3. Click **⋯** (three dots) → **Redeploy**
4. Select **Use existing Build Cache: No**
5. Click **Redeploy**

**Option B: Trigger new deployment**
1. Make a dummy commit:
   ```bash
   git commit --allow-empty -m "Force Vercel redeploy"
   git push
   ```

### Step 6: Verify Deployment

**Wait 2-3 minutes for deployment to complete, then:**

1. **Check Functions tab** → Should show:
   ```
   /api/admin/queue/set-status
   /api/admin/queue/update-details
   /api/admin/queue/start-washing
   /api/admin/queue/mark-done
   /api/admin/queue/remove
   ... (and more)
   ```

2. **Test API endpoint in browser:**
   ```
   https://laundryapp-one.vercel.app/api/admin/queue/set-status
   ```
   
   **Expected response:**
   - ❌ `404` = Still broken (repeat Step 4-5)
   - ✅ `401 Unauthorized` = **WORKING!** (API is live, just needs auth)
   - ✅ `{"error": "Missing or invalid Authorization header"}` = **WORKING!**

3. **Test in app:**
   - Login as admin
   - Try to ban/unban a student
   - Should get **401** or **403** instead of **404**

## 📋 Quick Checklist

- [ ] Opened Vercel Dashboard
- [ ] Verified Framework Preset = "Next.js"
- [ ] Verified Build Command = "next build" or empty
- [ ] Verified Output Directory = empty or ".next"
- [ ] Cleared build cache and redeployed
- [ ] Checked Functions tab shows API routes
- [ ] Tested API endpoint returns 401 instead of 404
- [ ] Tested admin functions in app

## 🔍 Troubleshooting

### If Functions tab is still empty after redeploy:

1. **Check deployment logs:**
   - Go to latest deployment
   - Check for errors like "Static HTML export"
   - Look for "Generating static pages" (this is BAD)
   - Should see "Compiled successfully" and "Lambda" functions

2. **Check for conflicting files:**
   ```bash
   # In your local repo
   git ls-files | grep -E "(\.vercelignore|\.nowignore)"
   ```
   - If these files exist and block `/api`, delete them

3. **Nuclear option - Delete and reimport:**
   - Settings → General → Delete Project
   - Import project again from GitHub
   - Ensure "Framework Preset" is set to "Next.js" during import

### If you get 401 after fixing 404:

✅ **This is GOOD!** It means API routes are working.

Now add environment variable:
1. Settings → Environment Variables
2. Add: `SUPABASE_URL` = (your Supabase URL)
3. Redeploy
4. Should work!

## 📞 What to Report Back

After following these steps, report:

1. ✅/❌ Functions tab shows API routes
2. ✅/❌ API endpoint returns 401 instead of 404
3. ✅/❌ Admin functions work in app
4. Any error messages from deployment logs

---

**Last updated:** 2026-01-10 16:45 UTC+6
**Commits deployed:** dc9ec73, 395b31b
**Status:** Waiting for manual Vercel dashboard fix
