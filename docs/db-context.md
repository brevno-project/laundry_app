# Database Architecture Context - Laundry App

## Core Tables & Schema

### students
- **id**: UUID (primary key)
- **user_id**: UUID (links to auth.users)
- **firstname**, **lastname**, **fullname**: Student names
- **room**: Room number
- **avatar_type**: Avatar identifier
- **is_registered**: Boolean (registration status)
- **is_admin**: Boolean (admin rights)
- **is_super_admin**: Boolean (super admin rights)
- **is_banned**: Boolean (ban status)
- **telegram_chat_id**: String (for notifications)
- **can_view_students**: Boolean (permission flag)

### queue
- **id**: UUID (primary key)
- **student_id**: UUID (references students.id)
- **user_id**: UUID (references auth.users, can be NULL for unclaimed)
- **queue_position**: Integer (position in queue)
- **payment_method**: Enum ('cash' | 'coupon' | 'returning_key')
- **status**: Enum ('waiting' | 'washing' | 'drying' | 'finished')
- **machine_number**: Integer (1 or 2)
- **created_at**: Timestamp
- **updated_at**: Timestamp

### machine_state
- **id**: UUID (primary key)
- **machine_number**: Integer (1 or 2)
- **is_occupied**: Boolean
- **current_user_id**: UUID (references auth.users)
- **status**: String
- **updated_at**: Timestamp

### history
- **id**: UUID (primary key)
- **student_id**: UUID (references students.id)
- **action**: String
- **timestamp**: Timestamp
- **details**: JSON

## Key Database Functions

### is_admin()
Returns true if current user is admin (not banned).

### is_super_admin()
Returns true if current user is super admin (not banned).

## RLS Policies Summary

**Super Admin can:**
- Update/delete all students (except self)
- Full control over queue, machine_state, history
- Manage other admins

**Regular Admin can:**
- Update/delete all students EXCEPT super admins
- Manage queue entries EXCEPT super admin entries
- Cannot delete super admins

**Regular User can:**
- Update own student record (avatar, telegram)
- Manage own queue entries
- Claim unowned queue entries

## Critical Code Locations

### Frontend Context
- `src/contexts/LaundryContext.tsx` - Main state management, all CRUD operations

### API Routes
- `src/app/api/student/claim/route.ts` - Queue claiming logic
- `src/app/api/admin/` - Admin operations (ban, update, reset)
- `src/app/api/telegram/` - Telegram integration

### Key Functions in LaundryContext
- `joinQueue()` - Adding to queue with user_id sync
- `leaveQueue()` - Queue removal
- `claimQueueItem()` - Claiming unowned entries
- `adminAddToQueue()` - Admin queue management
- `banStudent()`, `unbanStudent()` - Ban operations
- `updateStudent()` - Student data updates

## Common Issues & Solutions

### User ID Sync Problems
- New users get `isNewUser` flag in localStorage
- Bypass strict sync check on first queue join
- Flag resets after successful queue entry

### RLS Permission Errors
- Check Supabase Auth session is active
- Verify `auth.uid()` matches `user_id` in tables
- Admin operations need proper role checks

### Queue State Issues
- `queue_position` auto-recalculates on changes
- Status transitions: waiting → washing → drying → finished
- Machine state updates trigger queue status changes

## Migration Files
- Latest migration: `supabase/migrations/policies.sql`
- Contains all RLS policies and helper functions

## Environment Variables Needed
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (legacy)
