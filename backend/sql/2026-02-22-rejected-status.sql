-- Run this in Supabase SQL editor before using the REJECTED flow if your status column uses enums/checks.

-- 1) If your project has an enum type named job_status, add REJECTED safely.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'REJECTED';
  END IF;
END $$;

-- 2) If your status column uses a CHECK constraint instead of enum, update it.
-- Replace `print_jobs_status_check` with your actual constraint name if different.
ALTER TABLE print_jobs DROP CONSTRAINT IF EXISTS print_jobs_status_check;
ALTER TABLE print_jobs
  ADD CONSTRAINT print_jobs_status_check
  CHECK (status IN ('PENDING', 'APPROVED', 'PRINTING', 'DONE', 'FAILED', 'REJECTED'));
