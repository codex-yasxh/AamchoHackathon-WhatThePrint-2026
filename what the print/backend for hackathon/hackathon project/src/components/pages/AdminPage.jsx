import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function getDisplayFileName(filePath) {
  if (!filePath) return "Unknown file";
  const tail = filePath.split("/").pop() || filePath;
  return tail.replace(/^\d+-/, "");
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

const STATUS_ORDER = ["PENDING", "APPROVED", "PRINTING", "DONE", "FAILED"];

function AdminPage({ apiBaseUrl }) {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({
    counts: { PENDING: 0, APPROVED: 0, PRINTING: 0, DONE: 0, FAILED: 0 },
    today_counts: { PENDING: 0, APPROVED: 0, PRINTING: 0, DONE: 0, FAILED: 0 },
    todayTrend: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [approvingId, setApprovingId] = useState("");

  const pendingCount = useMemo(() => jobs.length, [jobs]);

  const totalJobsToday = useMemo(
    () => (stats.todayTrend || []).reduce((sum, point) => sum + (point.count || 0), 0),
    [stats.todayTrend],
  );

  const barData = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        count: stats.counts?.[status] || 0,
      })),
    [stats.counts],
  );

  const lineData = useMemo(() => stats.todayTrend || [], [stats.todayTrend]);

  const fetchPendingJobs = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/api/jobs?status=PENDING`);
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to fetch pending jobs");
    }

    setJobs(payload.data || []);
  }, [apiBaseUrl]);

  const fetchStats = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/api/jobs/stats`);
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to fetch stats");
    }

    setStats(payload.data || stats);
  }, [apiBaseUrl]);

  const refreshAll = useCallback(async () => {
    setError("");
    try {
      await Promise.all([fetchPendingJobs(), fetchStats()]);
    } catch (err) {
      console.error("[ADMIN REFRESH ERROR]", err);
      setError(err.message || "Failed to refresh dashboard");
    }
  }, [fetchPendingJobs, fetchStats]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      await refreshAll();
      if (mounted) {
        setIsLoading(false);
      }
    }

    load();

    const intervalId = setInterval(() => {
      refreshAll();
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [refreshAll]);

  const refresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
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

      setJobs((prev) => prev.filter((job) => job.id !== jobId));
      await fetchStats();
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

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Total Jobs Today</p>
            <p className="mt-2 font-display text-4xl text-[var(--accent)]">{totalJobsToday}</p>
          </div>
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Completed</p>
            <p className="mt-2 font-display text-4xl text-[var(--accent)]">{stats.today_counts?.DONE || 0}</p>
          </div>
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Failed</p>
            <p className="mt-2 font-display text-4xl text-[var(--danger)]">{stats.today_counts?.FAILED || 0}</p>
          </div>
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Pending</p>
            <p className="mt-2 font-display text-4xl text-[var(--accent)]">{stats.today_counts?.PENDING || 0}</p>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Jobs By Status</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis dataKey="status" stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-strong)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--text)",
                    }}
                  />
                  <Bar dataKey="count" fill="var(--accent)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">Jobs Over Time (Last 24h)</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis dataKey="hour" stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-strong)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--text)",
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

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
