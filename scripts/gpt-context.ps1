# scripts/gpt-context.ps1
$ErrorActionPreference = "Stop"

# repo root
$root = git rev-parse --show-toplevel 2>$null
if (-not $root) { throw "Not a git repo" }
Set-Location $root

$outDir = Join-Path $root "tmp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outFile = Join-Path $outDir "gpt-context.md"

function SafeRead($path, $maxLines = 250) {
  if (Test-Path $path) {
    $lines = Get-Content $path -ErrorAction SilentlyContinue
    if ($lines.Count -gt $maxLines) { $lines = $lines[0..($maxLines-1)] + "...(trimmed)" }
    return ($lines -join "`n")
  }
  return "(missing: $path)"
}

# latest migration
$migrationsDir = Join-Path $root "supabase/migrations"
$latestMig = Get-ChildItem $migrationsDir -Filter "*.sql" -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending | Select-Object -First 1

$latestMigName = if ($latestMig) { $latestMig.Name } else { "(none)" }
$latestMigBody = if ($latestMig) { SafeRead $latestMig.FullName 320 } else { "" }

# important code snippets
$laundryCtx = "src/contexts/LaundryContext.tsx"
$claimApi   = "src/app/api/student/claim/route.ts"
$claimUi    = "src/components/ClaimAccount.tsx"

$gitStatus = (git status -sb)
$gitLast   = (git log -1 --oneline)
$gitDiff   = (git diff --stat)

$body = @"
# GPT Context Pack — Laundry App

## What I need from you
1) Diagnose the bug based on this context
2) Propose exact fix (SQL/code) with minimal changes

## Repo state
### git status
```
$gitStatus
```

### last commit
```
$gitLast
```

### diff stat
```
$gitDiff
```

## DB architecture quick
### docs/db-context.md
$(SafeRead "docs/db-context.md" 200)

## Latest Supabase migration
### $latestMigName
```sql
$latestMigBody
```

## Key code files (trimmed)

### $laundryCtx

```tsx
$(SafeRead $laundryCtx 260)
```

### $claimApi

```ts
$(SafeRead $claimApi 220)
```

### $claimUi

```tsx
$(SafeRead $claimUi 220)
```

## Error / Stacktrace (paste here)

(put the error below)
"@

Set-Content -Path $outFile -Value $body -Encoding UTF8

# copy to clipboard (Windows)
try { Get-Content $outFile | Set-Clipboard } catch {}

Write-Host "Wrote: $outFile"
Write-Host "Copied to clipboard."
