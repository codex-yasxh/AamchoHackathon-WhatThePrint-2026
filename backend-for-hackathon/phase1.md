Phase 1 is now implemented and verified.

Implemented

Status transition validation (strict)
Added transition map in jobs.js (line 11).
Enforced:
PENDING -> APPROVED
APPROVED -> PRINTING
PRINTING -> DONE | FAILED
Blocks invalid transitions with 409 in:
jobs.js (line 152) (/approve)
jobs.js (line 204) (/status)
GET /api/jobs?status=APPROVED
Added status filter + validation in jobs.js (line 89).
Invalid status filter returns 400.
GET /api/jobs/:id
Added single-job fetch endpoint in jobs.js (line 128).
Basic rate limiting
Installed express-rate-limit in package.json (line 23).
Added:
API limiter in server.js (line 16)
Stricter upload limiter in server.js (line 25)
Applied at server.js (line 33) and server.js (line 34)
Basic logging
Added/kept logs for upload success, fetches, approvals, status requests, transitions, and errors.
Example: jobs.js (line 209) ([STATUS REQUEST]).
Validation run (real API test)

PENDING -> DONE returned: Invalid status transition: PENDING -> DONE
PENDING -> APPROVED succeeded
APPROVED -> PRINTING succeeded
PRINTING -> DONE succeeded