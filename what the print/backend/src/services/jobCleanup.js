const DONE_RETENTION_MINUTES = Number(process.env.DONE_RETENTION_MINUTES || '2');
const STORAGE_BUCKET = process.env.PRINT_BUCKET || 'print-files';

function getDoneCutoffIso(nowMs = Date.now()) {
  return new Date(nowMs - DONE_RETENTION_MINUTES * 60 * 1000).toISOString();
}

function isDoneJobExpired(updatedAtIso, nowMs = Date.now()) {
  if (!updatedAtIso) return false;
  const updatedAtMs = new Date(updatedAtIso).getTime();
  if (Number.isNaN(updatedAtMs)) return false;
  return updatedAtMs < nowMs - DONE_RETENTION_MINUTES * 60 * 1000;
}

async function cleanupDoneJobs() {
  const supabase = require('../lib/supabase');
  const cutoffIso = getDoneCutoffIso();

  const { data: doneJobs, error: selectError } = await supabase
    .from('print_jobs')
    .select('id,file_url')
    .eq('status', 'DONE')
    .lt('updated_at', cutoffIso)
    .limit(200);

  if (selectError) {
    throw selectError;
  }

  if (!doneJobs || doneJobs.length === 0) {
    return { deletedJobs: 0, deletedFiles: 0 };
  }

  const filePaths = doneJobs.map((job) => job.file_url).filter(Boolean);
  let deletedFiles = 0;

  if (filePaths.length > 0) {
    const { data: removedFiles, error: removeError } = await supabase.storage.from(STORAGE_BUCKET).remove(filePaths);
    if (removeError) {
      throw removeError;
    }
    deletedFiles = Array.isArray(removedFiles) ? removedFiles.length : filePaths.length;
  }

  const doneJobIds = doneJobs.map((job) => job.id);
  const { error: deleteError } = await supabase.from('print_jobs').delete().in('id', doneJobIds);
  if (deleteError) {
    throw deleteError;
  }

  return { deletedJobs: doneJobIds.length, deletedFiles };
}

module.exports = {
  DONE_RETENTION_MINUTES,
  getDoneCutoffIso,
  isDoneJobExpired,
  cleanupDoneJobs
};
