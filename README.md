# What The Print - Remote Print Queue System

## Core Idea: 2 Worlds + 1 Brain

This project works across two physical environments.

### World 1: Cloud
- Frontend: Vercel
- Backend API: Node.js + Express (Render)
- Database: Supabase PostgreSQL
- File Storage: Supabase Storage

Cloud handles coordination, validation, and job state.

### World 2: Local Shop PC
- Windows machine in the print shop
- USB printer connected to this machine
- Local Node.js print agent process running in background

Local machine handles hardware printing.

### The Bridge Rule
The cloud backend never directly controls the USB printer.
Only the local print agent prints.

## Infrastructure Summary
- 1 Cloud Backend Server (Render)
- 1 PostgreSQL Database (Supabase)
- 1 File Storage Bucket (Supabase Storage)
- 1 Frontend (Netlify)
- 1 Local Print Agent on shop PC
- 1 USB printer on shop PC

No tunnel server. No direct cloud-to-printer path.

## End-to-End Flow
1. Customer uploads file in frontend.
2. Frontend sends multipart upload to backend.
3. Backend uploads file to Supabase Storage and creates DB job with `status = PENDING`.
4. Admin opens dashboard and approves pending job.
5. Backend updates job to `status = APPROVED`.
6. Local print agent polls DB every few seconds for approved jobs.
7. Agent claims job (`APPROVED -> PRINTING`), downloads file, prints locally.
8. Agent updates job to `DONE` on success or `FAILED` on error.
9. Backend cleanup worker removes `DONE` jobs and their storage files after retention window (default 2 minutes).

## Job Status Model
- `PENDING`: uploaded, waiting admin approval
- `APPROVED`: approved and waiting local print agent
- `PRINTING`: claimed by agent and printing in progress
- `DONE`: printed successfully
- `FAILED`: print failed
- `REJECTED`: admin rejected before printing

Allowed transitions:
- `PENDING -> APPROVED`
- `PENDING -> REJECTED`
- `APPROVED -> PRINTING`
- `PRINTING -> DONE | FAILED`

## Data Model
Primary table: `print_jobs`

Current required columns used by code:
- `id` (uuid, primary key)
- `file_url` (text, storage path)
- `status` (enum/text)
- `copies` (int)
- `page_range` (text, `ALL` or ranges like `1-3,5`)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Storage bucket holds file binaries (`print-files` by default).

If `status` is enforced via enum/check in Supabase, run:
- `backend/sql/2026-02-22-rejected-status.sql`

## API Overview
Base backend path: `/api/jobs`

- `POST /upload` - upload file and create `PENDING` job
- `GET /` - list jobs (optional `?status=` filter)
- `GET /stats` - dashboard stats
- `GET /queue/summary` - live queue pressure
- `GET /:id` - single job by id
- `GET /:id/queue` - queue position for one job
- `PUT /:id/approve` - `PENDING -> APPROVED`
- `PUT /:id/reject` - `PENDING -> REJECTED`
- `PUT /:id/status` - controlled status updates

## Project Structure
- `backend/` - Express API + Supabase integration
- `frontend/` - React frontend (customer + `/admin`)
- `print-agent/` - local polling and printing worker

## Environment Setup

### 1) Backend (`backend/.env`)
```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PRINT_BUCKET=print-files
DONE_RETENTION_MINUTES=2
```

### 2) Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:3000
```

### 3) Print Agent (`print-agent/.env`)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
POLL_INTERVAL_MS=4000
STALE_PRINTING_MINUTES=10
PRINT_BUCKET=print-files
PRINTER_NAME=
AGENT_LOG_FILE=logs/agent.log
```

## Local Development Run

### Backend
```bash
cd "backend"
npm install
npm start
```

### Frontend
```bash
cd "frontend"
npm install
npm run dev
```

### Print Agent (on Windows shop PC)
```bash
cd "print-agent"
npm install
npm start
```

## Windows Auto-Start for Agent
1. Keep `print-agent` folder at a stable path.
2. Press `Win + R`, run `shell:startup`.
3. Copy `start-agent.bat` into that Startup folder.
4. Re-login/restart and verify logs:
   - `logs/agent.log`
   - `logs/startup.log`

## Architecture Guardrails
- Do not attempt cloud-to-USB direct print calls.
- Keep printer control only inside local print agent.
- Keep status transition checks strict.
- Prefer polling model unless intentionally redesigning.
