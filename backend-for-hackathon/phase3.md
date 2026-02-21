Phase 3 is now implemented.

Created

package.json
index.js
.env.example
README.md
Installed dependencies

@supabase/supabase-js
node-fetch
pdf-to-printer
dotenv
Implemented behavior

Polls every 4000ms (configurable via POLL_INTERVAL_MS)
Fetches APPROVED jobs only
Atomically claims each job with APPROVED -> PRINTING
Downloads file from private bucket using file_url path
Saves temporary local file
Prints using pdf-to-printer
Updates:
success -> DONE
error after claim -> FAILED
Cleans up temp file after processing
Prevents overlapping poll cycles (isPolling guard)
Safety note included

It does not mark FAILED unless the job was successfully claimed as PRINTING.
Verified

index.js passes
npm ls --depth=0 shows all required packages installed
Run on shop PC

Copy print-agent folder to shop PC
Create .env from .env.example
Set real values:
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
optional PRINTER_NAME
Run:
npm install
npm start
If you want, next I can do Phase 4: Windows service setup (node-windows) so agent runs in background on boot.