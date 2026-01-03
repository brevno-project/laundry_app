# Database Context Rule

Always consider the database architecture and policies when working on the laundry app.

## Required Reading
Before making any database-related changes, read docs/db-context.md which contains:
- Complete table schemas and relationships
- RLS policies and permission matrix
- Key functions and their purposes
- Common issues and solutions
- Critical code locations

## Key Principles
1. **RLS First**: All database operations must respect Row Level Security policies
2. **User ID Sync**: Ensure uth.uid() matches user_id in tables for proper permissions
3. **Admin Hierarchy**: Super admins > Regular admins > Regular users
4. **Queue State Machine**: Follow proper status transitions in queue operations

## Common Gotchas
- New users need special handling for user_id sync (isNewUser flag)
- Admin operations require proper session validation
- Queue claiming has special RLS policy for unowned entries
- Machine state updates affect queue status automatically

## Files to Always Check
- src/contexts/LaundryContext.tsx - Main business logic
- supabase/migrations/policies.sql - Current RLS policies
- src/app/api/ routes - Server-side operations

When debugging database issues, always start with the context in docs/db-context.md.
