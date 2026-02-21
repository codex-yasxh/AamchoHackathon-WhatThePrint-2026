# Print Agent (Shop PC)

Local Node.js worker that polls Supabase for approved print jobs and prints on a Windows USB printer.

## Install

```bash
npm install
```

## Configure

Create `.env` from `.env.example`:

```env
SUPABASE_URL=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx
# Alternative supported:
# SUPABASE_SERVICE_ROLE=xxxx
POLL_INTERVAL_MS=4000
STALE_PRINTING_MINUTES=10
PRINT_BUCKET=print-files
PRINTER_NAME=
AGENT_LOG_FILE=logs/agent.log
```

`PRINTER_NAME` is optional. If empty, default Windows printer is used.

## Run

```bash
npm start
```

## Auto-run on Windows Startup (Hackathon-safe)

1. Keep `print-agent` folder at a stable path on shop PC.
2. Press `Win + R`, run: `shell:startup`
3. Copy `start-agent.bat` into that Startup folder.
4. Reboot or sign out/sign in to verify startup launch.

## Logs

- Runtime logs: `logs/agent.log`
- Startup stdout/stderr log: `logs/startup.log`

If printing fails during demo, inspect these logs first.

## Job flow

1. Poll `print_jobs` where `status = APPROVED`
2. Atomically claim each job by updating to `PRINTING`
3. Download file from private Supabase Storage (`file_url` path)
4. Save to temp file and print via `pdf-to-printer`
5. Update status to `DONE` on success, `FAILED` on error
6. Delete temp file
7. Reset stale `PRINTING` jobs older than threshold back to `APPROVED`
