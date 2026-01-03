# GPT Context System - Quick Reference

## One-Command Debugging

**When you have a bug:**
1. Type `/triage` in chat
2. Paste the error when asked
3. Get exact fix (SQL/code)

## Files Created

- `docs/db-context.md` - Database architecture
- `scripts/gpt-context.ps1` - Context collector
- `.windsurf/rules/db-context.md` - Auto-load context
- `.windsurf/workflows/triage.md` - Debug workflow

## Manual Usage

```bash
powershell -ExecutionPolicy Bypass -File scripts/gpt-context.ps1
# Creates: tmp/gpt-context.md (copied to clipboard)
```

## What It Collects

- Git status + last commit
- Database architecture
- Latest migration
- Key code files (LaundryContext, claim API, UI)
- Ready for error paste

## Benefits

- ✅ No context loss in new chats
- ✅ One-command debugging
- ✅ Targeted solutions
- ✅ Auto-clipboard copy

That's it. Use `/triage` when you need help.
