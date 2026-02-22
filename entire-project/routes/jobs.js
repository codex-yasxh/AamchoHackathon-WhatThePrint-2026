const express = require('express');
const multer = require('multer');
const supabase = require('../src/lib/supabase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const STORAGE_BUCKET = 'print-files';
const AVG_PRINT_TIME_SECONDS = 30;
const ALLOWED_STATUS_VALUES = ['PENDING', 'APPROVED', 'PRINTING', 'DONE', 'FAILED'];
const ALLOWED_STATUS_UPDATES = ['PRINTING', 'DONE', 'FAILED'];
const STATUS_TRANSITIONS = {
  PENDING: ['APPROVED'],
  APPROVED: ['PRINTING'],
  PRINTING: ['DONE', 'FAILED'],
  DONE: [],
  FAILED: []
};

function buildStoragePath(originalName) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `jobs/${Date.now()}-${safeName}`;
}

function canTransition(currentStatus, nextStatus) {
  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

function isValidUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

async function getJobById(id) {
  if (!isValidUuid(id)) {
    return {
      job: null,
      error: {
        message: 'Invalid job id format',
        code: 'INVALID_UUID'
      }
    };
  }

  const { data: job, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  return { job, error };
}

// POST /api/jobs/upload
// Accepts multipart form-data "file", uploads to private storage, then creates DB record with storage path
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded. Use form-data key "file".' });
    }

    const filePath = buildStoragePath(req.file.originalname);

    console.log('[UPLOAD] Uploading file to Supabase Storage:', filePath);

    const { data: storageData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('[UPLOAD ERROR]', uploadError);
      return res.status(500).json({ success: false, error: 'Failed to upload file to storage' });
    }

    const { data: job, error: insertError } = await supabase
      .from('print_jobs')
      .insert([
        {
          file_url: storageData.path,
          status: 'PENDING'
        }
      ])
      .select('*')
      .single();

    if (insertError) {
      console.error('[DB INSERT ERROR]', insertError);
      return res.status(500).json({ success: false, error: 'Failed to create print job' });
    }

    console.log('[UPLOAD SUCCESS] Job created:', { id: job.id, filePath: storageData.path, status: job.status });

    return res.status(201).json({ success: true, data: job });
  } catch (error) {
    console.error('[POST /upload ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/jobs/stats
// Returns real status counts and last-24h hourly trend for admin analytics
router.get('/stats', async (req, res) => {
  try {
    const statusTemplate = {
      PENDING: 0,
      APPROVED: 0,
      PRINTING: 0,
      DONE: 0,
      FAILED: 0
    };

    const { data: statusRows, error: statusError } = await supabase
      .from('print_jobs')
      .select('status');

    if (statusError) {
      console.error('[DB STATS STATUS ERROR]', statusError);
      return res.status(500).json({ success: false, error: 'Failed to fetch status counts' });
    }

    const counts = { ...statusTemplate };
    for (const row of statusRows || []) {
      if (counts[row.status] !== undefined) {
        counts[row.status] += 1;
      }
    }

    const trendStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: todayRows, error: trendError } = await supabase
      .from('print_jobs')
      .select('created_at,status')
      .gte('created_at', trendStart)
      .order('created_at', { ascending: true });

    if (trendError) {
      console.error('[DB STATS TREND ERROR]', trendError);
      return res.status(500).json({ success: false, error: 'Failed to fetch today trend' });
    }

    const hourlyMap = new Map();
    const todayCounts = { ...statusTemplate };

    for (const row of todayRows || []) {
      const hourDate = new Date(row.created_at);
      hourDate.setUTCMinutes(0, 0, 0);
      const bucketKey = hourDate.toISOString();
      hourlyMap.set(bucketKey, (hourlyMap.get(bucketKey) || 0) + 1);

      if (todayCounts[row.status] !== undefined) {
        todayCounts[row.status] += 1;
      }
    }

    const todayTrend = Array.from(hourlyMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([bucketKey, count]) => ({
        hour: `${new Date(bucketKey).getUTCHours().toString().padStart(2, '0')}:00`,
        count
      }));

    return res.status(200).json({
      success: true,
      data: {
        counts,
        today_counts: todayCounts,
        todayTrend
      }
    });
  } catch (error) {
    console.error('[GET /stats ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/jobs/queue/summary
// Returns live queue pressure for customer-side pre-upload UX
router.get('/queue/summary', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('print_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['APPROVED', 'PRINTING']);

    if (error) {
      console.error('[DB QUEUE SUMMARY ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch queue summary' });
    }

    const peopleAhead = count || 0;
    const estimatedSeconds = peopleAhead * AVG_PRINT_TIME_SECONDS;

    return res.status(200).json({
      success: true,
      data: {
        people_ahead: peopleAhead,
        estimated_seconds: estimatedSeconds
      }
    });
  } catch (error) {
    console.error('[GET /queue/summary ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/jobs
// Optional filter: /api/jobs?status=APPROVED
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    if (status && !ALLOWED_STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status filter. Allowed values: ${ALLOWED_STATUS_VALUES.join(', ')}`
      });
    }

    let query = supabase
      .from('print_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('[DB SELECT ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
    }

    console.log('[FETCH JOBS] Success:', { count: jobs.length, status: status || 'ALL' });

    return res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    console.error('[GET / ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/jobs/:id/queue
// Returns queue position and ETA for a single job
router.get('/:id/queue', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid job id format' });
    }

    const { job, error: jobError } = await getJobById(id);

    if (jobError) {
      console.error('[DB QUEUE JOB FETCH ERROR]', jobError);
      return res.status(500).json({ success: false, error: 'Failed to fetch job for queue position' });
    }

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const { count, error: countError } = await supabase
      .from('print_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['APPROVED', 'PRINTING'])
      .lt('created_at', job.created_at);

    if (countError) {
      console.error('[DB QUEUE COUNT ERROR]', countError);
      return res.status(500).json({ success: false, error: 'Failed to calculate queue position' });
    }

    const position = count || 0;
    const estimatedSeconds = position * AVG_PRINT_TIME_SECONDS;

    return res.status(200).json({
      success: true,
      data: {
        position,
        estimated_seconds: estimatedSeconds
      }
    });
  } catch (error) {
    console.error('[GET /:id/queue ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/jobs/:id
// Fetch single job by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid job id format' });
    }

    const { job, error } = await getJobById(id);

    if (error) {
      console.error('[DB SINGLE SELECT ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch job' });
    }

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    console.error('[GET /:id ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/jobs/:id/approve
// Enforces transition: PENDING -> APPROVED
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid job id format' });
    }

    const { job: existingJob, error: fetchError } = await getJobById(id);

    if (fetchError) {
      console.error('[DB APPROVE FETCH ERROR]', fetchError);
      return res.status(500).json({ success: false, error: 'Failed to load current job status' });
    }

    if (!existingJob) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (!canTransition(existingJob.status, 'APPROVED')) {
      return res.status(409).json({
        success: false,
        error: `Invalid status transition: ${existingJob.status} -> APPROVED`
      });
    }

    const { data: updatedJob, error: updateError } = await supabase
      .from('print_jobs')
      .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', existingJob.status)
      .select('*')
      .maybeSingle();

    if (updateError) {
      console.error('[DB APPROVE UPDATE ERROR]', updateError);
      return res.status(500).json({ success: false, error: 'Failed to approve job' });
    }

    if (!updatedJob) {
      return res.status(409).json({ success: false, error: 'Job status changed concurrently. Retry.' });
    }

    console.log('[APPROVE SUCCESS] Transition:', { id, from: existingJob.status, to: updatedJob.status });

    return res.status(200).json({ success: true, data: updatedJob });
  } catch (error) {
    console.error('[PUT /:id/approve ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/jobs/:id/status
// Enforces transitions:
// APPROVED -> PRINTING
// PRINTING -> DONE or FAILED
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const nextStatus = typeof req.body?.status === 'string' ? req.body.status : '';

    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid job id format' });
    }

    console.log('[STATUS REQUEST]', { id, requestedStatus: nextStatus || null });

    if (!ALLOWED_STATUS_UPDATES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed values: ${ALLOWED_STATUS_UPDATES.join(', ')}`
      });
    }

    const { job: existingJob, error: fetchError } = await getJobById(id);

    if (fetchError) {
      console.error('[DB STATUS FETCH ERROR]', fetchError);
      return res.status(500).json({ success: false, error: 'Failed to load current job status' });
    }

    if (!existingJob) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (!canTransition(existingJob.status, nextStatus)) {
      return res.status(409).json({
        success: false,
        error: `Invalid status transition: ${existingJob.status} -> ${nextStatus}`
      });
    }

    const { data: updatedJob, error: updateError } = await supabase
      .from('print_jobs')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', existingJob.status)
      .select('*')
      .maybeSingle();

    if (updateError) {
      console.error('[DB STATUS UPDATE ERROR]', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update job status' });
    }

    if (!updatedJob) {
      return res.status(409).json({ success: false, error: 'Job status changed concurrently. Retry.' });
    }

    console.log('[STATUS SUCCESS] Transition:', { id, from: existingJob.status, to: updatedJob.status });

    return res.status(200).json({ success: true, data: updatedJob });
  } catch (error) {
    console.error('[PUT /:id/status ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
