Phase 4 is now applied.

Implemented hardening

index.js

Added stale job recovery:
Detects PRINTING jobs older than STALE_PRINTING_MINUTES (default 10)
Resets them to APPROVED
Keeps existing anti-double-print claim:
APPROVED -> PRINTING atomic update with status condition
Env safety:
Uses env only (no hardcoded keys)
Supports both:
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SERVICE_ROLE (fallback)
.env.example

Added:
STALE_PRINTING_MINUTES=10
comment for alternative key name support
d:\backend for hackathon\print-agent\.gitignore

Added secret protection:
.env
.env.*
keeps .env.example
ignores node_modules, logs, temp
Validation

index.js passes.
New stale-reset logic is present and wired into polling.
If you want, next I can add a lightweight HEALTH log line every N polls (counts, reset count, processed count) so demo monitoring is easier.