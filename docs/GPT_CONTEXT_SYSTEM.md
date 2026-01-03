# GPT Context System - Laundry App

## Quick Start

1. **Run triage workflow**: `/triage`
2. **Paste error**: Copy the error message and paste it when asked
3. **Get solution**: Receive exact fix (SQL/code) with minimal changes

## How It Works

### 1. Permanent Context (.windsurf/rules/db-context.md)
Windsurf automatically loads database architecture context for every chat:
- Table schemas and relationships
- RLS policies and permissions
- Common issues and solutions
- Key file locations

### 2. Context Collection Script (scripts/gpt-context.ps1)
Collects everything needed for debugging:
- Latest git status and commits
- Database context documentation
- Latest migration file
- Key code files (LaundryContext.tsx, claim API, ClaimAccount.tsx)
- Copies everything to clipboard automatically

### 3. Triage Workflow (.windsurf/workflows/triage.md)
One-command workflow that:
- Runs the context collection script
- Reads the generated context
- Asks for specific error details
- Provides targeted solution

## Usage Examples

### Debug Database Permission Error
```
/triage
[paste error: "new row violates row-level security policy for table queue"]
```

### Fix Queue State Issue
```
/triage
[paste error: "Cannot update queue status: invalid transition"]
```

### Investigate Admin Function
```
/triage
[paste error: "Admin cannot ban student: permission denied"]
```

## File Structure

```
.windsurf/
├── rules/
│   └── db-context.md      # Permanent database context
└── workflows/
    └── triage.md          # Debug workflow

docs/
└── db-context.md          # Database architecture docs

scripts/
└── gpt-context.ps1       # Context collection script

tmp/
└── gpt-context.md        # Generated context file
```

## Manual Script Usage

If you want to run the script directly:
```bash
# Windows
powershell -ExecutionPolicy Bypass -File scripts/gpt-context.ps1

# Output: tmp/gpt-context.md (copied to clipboard)
```

## Customization

### Adding New Files to Context
Edit `scripts/gpt-context.ps1` and add new files:
```powershell
$newFile = "src/components/NewComponent.tsx"
# Add to $body section:
### $newFile
```tsx
$(SafeRead $newFile 220)
```
```

### Updating Database Context
Edit `docs/db-context.md` to add:
- New tables or columns
- Updated RLS policies
- New common issues
- Additional key functions

## Benefits

1. **No Context Loss**: New chats automatically load database context
2. **One-Command Debugging**: `/triage` collects everything needed
3. **Targeted Solutions**: Context-aware fixes with minimal changes
4. **Clipboard Integration**: Auto-copy for easy pasting
5. **Git Integration**: Includes repo state and recent changes

## Troubleshooting

### Script Not Running
- Use `powershell` instead of `pwsh` on Windows
- Check Execution Policy: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### Context Not Loading
- Verify `.windsurf/rules/db-context.md` exists
- Restart Windsurf after adding new rules

### Missing Files
- Check file paths in `scripts/gpt-context.ps1`
- Ensure files exist in the expected locations
