import { useCallback, useEffect, useMemo, useState } from "react";

function getDisplayFileName(filePath) {
  if (!filePath) return "Unknown file";
  const tail = filePath.split("/").pop() || filePath;
  return tail.replace(/^\d+-/, "");
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

function AdminPage({ apiBaseUrl }) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [approvingId, setApprovingId] = useState("");

  const pendingCount = useMemo(() => jobs.length, [jobs]);

  const fetchPendingJobs = useCallback(async () => {
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/jobs?status=PENDING`);
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to fetch pending jobs");
      }

      setJobs(payload.data || []);
    } catch (err) {
      console.error("[ADMIN FETCH ERROR]", err);
      setError(err.message || "Failed to fetch jobs");
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      await fetchPendingJobs();
      if (mounted) {
        setIsLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [fetchPendingJobs]);

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchPendingJobs();
    setIsRefreshing(false);
  };

  const approveJob = async (jobId) => {
    setApprovingId(jobId);
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/jobs/${jobId}/approve`, {
        method: "PUT",
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to approve job");
      }

      // Optimistic UI: remove approved job from pending list
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
    } catch (err) {
      console.error("[ADMIN APPROVE ERROR]", err);
      setError(err.message || "Failed to approve job");
    } finally {
      setApprovingId("");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-8">
          <h1 className="font-display text-2xl tracking-[0.2em]">ADMIN DASHBOARD</h1>
          <a className="tiny-link" href="/">
            Back To Store
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[var(--muted)]">
            Pending jobs: <strong className="text-[var(--text)]">{pendingCount}</strong>
          </p>
          <button className="btn-outline" onClick={refresh} type="button" disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-[8px] border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
        )}

        {isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading pending jobs...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No pending jobs.</p>
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-[var(--border)]">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-[var(--border)] text-[var(--muted)]">
                <tr>
                  <th className="p-3 text-left font-normal">File Name</th>
                  <th className="p-3 text-left font-normal">Created Time</th>
                  <th className="p-3 text-left font-normal">Status</th>
                  <th className="p-3 text-right font-normal">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-[var(--line)] bg-[var(--surface)]">
                    <td className="p-3">{getDisplayFileName(job.file_url)}</td>
                    <td className="p-3 text-[var(--muted)]">{formatDate(job.created_at)}</td>
                    <td className="p-3">{job.status}</td>
                    <td className="p-3 text-right">
                      <button
                        className="rounded-[8px] bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[#0d0d0d] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        onClick={() => approveJob(job.id)}
                        disabled={approvingId === job.id}
                      >
                        {approvingId === job.id ? "Approving..." : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminPage;
