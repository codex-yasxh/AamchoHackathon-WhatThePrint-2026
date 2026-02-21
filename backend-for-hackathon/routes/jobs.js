const express = require('express');
const multer = require('multer');
const supabase = require('../src/lib/supabase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const STORAGE_BUCKET = 'print-files';
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

async function getJobById(id) {
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

// GET /api/jobs/:id
// Fetch single job by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

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
