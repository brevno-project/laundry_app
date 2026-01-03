# /triage
## Purpose
Collect full debug context and then ask user for the failing symptom.

## Steps
1) Run context pack script:
- Windows: `powershell -ExecutionPolicy Bypass -File scripts/gpt-context.ps1` 
2) Open tmp/gpt-context.md and read it fully.
3) Ask the user to paste ONLY:
- the exact error message / stack trace
- what they clicked
- expected vs actual
4) Propose a fix as:
- (A) DB SQL (migration-ready)
- (B) code diff (exact file+lines)
- (C) test steps
