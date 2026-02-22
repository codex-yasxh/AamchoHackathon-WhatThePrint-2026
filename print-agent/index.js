const fs = require('fs/promises');
const fsSync = require('fs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { print } = require('pdf-to-printer');

dotenv.config();

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_SERVICE_ROLE,
  POLL_INTERVAL_MS = '4000',
  PRINT_BUCKET = 'print-files',
  PRINTER_NAME = '',
  STALE_PRINTING_MINUTES = '10',
  AGENT_LOG_FILE = 'logs/agent.log',
} = process.env;

const PAGE_RANGE_REGEX = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;

const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE)');
}

const supabase = createClient(SUPABASE_URL, serviceRoleKey);
const pollIntervalMs = Number(POLL_INTERVAL_MS) || 4000;
const stalePrintingMinutes = Number(STALE_PRINTING_MINUTES) || 10;

let isPolling = false;

const logFilePath = path.resolve(process.cwd(), AGENT_LOG_FILE);
const logDirPath = path.dirname(logFilePath);
if (!fsSync.existsSync(logDirPath)) {
  fsSync.mkdirSync(logDirPath, { recursive: true });
}

function writeLog(level, message, extra) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  const withExtra = extra ? `${line} | ${JSON.stringify(extra)}` : line;
  fsSync.appendFileSync(logFilePath, `${withExtra}\n`);

  if (level === 'ERROR') {
    console.error(withExtra);
  } else {
    console.log(withExtra);
  }
}

function logInfo(message, extra) {
  writeLog('INFO', message, extra);
}

function logError(message, extra) {
  writeLog('ERROR', message, extra);
}

function getTempOutputPath(jobId, storagePath) {
  const ext = path.extname(storagePath) || '.pdf';
  return path.join(os.tmpdir(), `print-job-${jobId}-${Date.now()}${ext}`);
}

function normalizePageRange(rawValue) {
  const value = String(rawValue ?? 'ALL').trim().replace(/\s+/g, '');
  if (!value || value.toUpperCase() === 'ALL') {
    return 'ALL';
  }

  if (!PAGE_RANGE_REGEX.test(value)) {
    return 'ALL';
  }

  return value;
}

function normalizeCopies(rawValue) {
  const copies = Number.parseInt(String(rawValue ?? '1'), 10);
  if (!Number.isInteger(copies) || copies < 1) {
    return 1;
  }
  return copies;
}

async function markJobStatus(id, status) {
  const { error } = await supabase
    .from('print_jobs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

async function claimJob(id) {
  const { data, error } = await supabase
    .from('print_jobs')
    .update({ status: 'PRINTING', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'APPROVED')
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function downloadToTempFile(storagePath, outputPath) {
  const { data, error } = await supabase.storage.from(PRINT_BUCKET).download(storagePath);

  if (error) {
    throw error;
  }

  const arrayBuffer = await data.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
}

async function resetStalePrintingJobs() {
  const staleThreshold = new Date(Date.now() - stalePrintingMinutes * 60 * 1000).toISOString();

  const { data: staleJobs, error: findError } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('status', 'PRINTING')
    .lt('updated_at', staleThreshold);

  if (findError) {
    throw findError;
  }

  if (!staleJobs || staleJobs.length === 0) {
    return 0;
  }

  for (const job of staleJobs) {
    const { error: resetError } = await supabase
      .from('print_jobs')
      .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'PRINTING');

    if (resetError) {
      logError(`Failed to reset stale PRINTING job ${job.id}`, { error: resetError.message || resetError });
      continue;
    }

    logInfo(`Reset stale PRINTING -> APPROVED for job ${job.id}`);
  }

  return staleJobs.length;
}

async function processJob(job) {
  let tempFilePath = '';
  let claimed = false;

  try {
    const claimedJob = await claimJob(job.id);

    if (!claimedJob) {
      logInfo(`Skip job ${job.id} (already claimed by another worker)`);
      return;
    }
    claimed = true;

    tempFilePath = getTempOutputPath(claimedJob.id, claimedJob.file_url);
    logInfo(`Processing job ${claimedJob.id}`, { tempFilePath });

    await downloadToTempFile(claimedJob.file_url, tempFilePath);

    const printOptions = {};

    if (PRINTER_NAME) {
      printOptions.printer = PRINTER_NAME;
    }

    const copies = normalizeCopies(claimedJob.copies);
    const pageRange = normalizePageRange(claimedJob.page_range);

    printOptions.copies = copies;
    if (pageRange !== 'ALL') {
      printOptions.pages = pageRange;
    }

    logInfo(`Sending job ${claimedJob.id} to printer`, {
      copies,
      pageRange,
      printer: PRINTER_NAME || 'default'
    });

    await print(tempFilePath, printOptions);

    await markJobStatus(claimedJob.id, 'DONE');
    logInfo(`Print success for job ${claimedJob.id} (DONE)`);
  } catch (error) {
    logError(`Print failed for job ${job.id}`, { error: error.message || error });

    if (claimed) {
      try {
        await markJobStatus(job.id, 'FAILED');
        logInfo(`Job ${job.id} marked as FAILED`);
      } catch (statusError) {
        logError(`Failed to mark FAILED for job ${job.id}`, { error: statusError.message || statusError });
      }
    }
  } finally {
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        // Temp file may already be missing; keep agent running
      }
    }
  }
}

async function pollApprovedJobs() {
  if (isPolling) {
    return;
  }

  isPolling = true;

  try {
    await resetStalePrintingJobs();

    const { data: jobs, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('status', 'APPROVED')
      .order('created_at', { ascending: true });

    if (error) {
      logError('Poll error', { error: error.message || error });
      return;
    }

    if (!jobs || jobs.length === 0) {
      return;
    }

    logInfo(`Found ${jobs.length} approved job(s)`);

    for (const job of jobs) {
      await processJob(job);
    }
  } catch (error) {
    logError('Unexpected polling error', { error: error.message || error });
  } finally {
    isPolling = false;
  }
}

logInfo(`Starting print agent. Poll interval: ${pollIntervalMs}ms`);
logInfo(`Stale PRINTING reset threshold: ${stalePrintingMinutes} minute(s)`);
logInfo(`Log file: ${logFilePath}`);
if (PRINTER_NAME) {
  logInfo(`Using printer: ${PRINTER_NAME}`);
}

pollApprovedJobs();
setInterval(pollApprovedJobs, pollIntervalMs);
