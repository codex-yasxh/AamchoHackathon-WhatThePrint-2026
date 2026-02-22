import { useEffect, useState } from "react";

function formatEta(seconds) {
  const minutes = Math.ceil((seconds || 0) / 60);
  if (minutes <= 0) return "< 1 min";
  return `~${minutes} min`;
}

function Hero({ apiBaseUrl }) {
  const [queue, setQueue] = useState({ peopleAhead: 0, estimatedSeconds: 0 });
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState("");
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const fetchQueueSummary = async () => {
      try {
        let nextQueue = null;

        // Preferred endpoint (new backend)
        const summaryRes = await fetch(`${apiBaseUrl}/api/jobs/queue/summary`);
        if (summaryRes.ok) {
          const summaryPayload = await summaryRes.json();
          if (summaryPayload.success) {
            nextQueue = {
              peopleAhead: summaryPayload.data.people_ahead || 0,
              estimatedSeconds: summaryPayload.data.estimated_seconds || 0,
            };
          }
        }

        // Fallback 1: existing filtered endpoint
        if (!nextQueue) {
          const pendingRes = await fetch(`${apiBaseUrl}/api/jobs?status=PENDING`);
          const pendingPayload = await pendingRes.json();

          if (pendingRes.ok && pendingPayload.success) {
            const peopleAhead = Array.isArray(pendingPayload.data) ? pendingPayload.data.length : 0;
            nextQueue = {
              peopleAhead,
              estimatedSeconds: peopleAhead * 30,
            };
          }
        }

        // Fallback 2: plain jobs endpoint then filter client-side
        if (!nextQueue) {
          const jobsRes = await fetch(`${apiBaseUrl}/api/jobs`);
          const jobsPayload = await jobsRes.json();

          if (jobsRes.ok && jobsPayload.success) {
            const jobs = Array.isArray(jobsPayload.data) ? jobsPayload.data : [];
            const peopleAhead = jobs.filter((job) => job.status === "PENDING").length;
            nextQueue = {
              peopleAhead,
              estimatedSeconds: peopleAhead * 30,
            };
          }
        }

        if (!nextQueue) {
          throw new Error("Live queue temporarily unavailable");
        }

        if (!isMounted) return;

        setQueue((prev) => {
          if (prev.peopleAhead !== nextQueue.peopleAhead || prev.estimatedSeconds !== nextQueue.estimatedSeconds) {
            setPulse(true);
            setTimeout(() => setPulse(false), 450);
          }
          return nextQueue;
        });

        setQueueError("");
      } catch (error) {
        if (!isMounted) return;
        // Keep previous queue values visible and show a soft retry hint.
        setQueueError(error.message || "Live queue temporarily unavailable");
      } finally {
        if (isMounted) {
          setIsLoadingQueue(false);
        }
      }
    };

    fetchQueueSummary();
    intervalId = setInterval(fetchQueueSummary, 4000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [apiBaseUrl]);

  return (
    <section className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--border)] px-4 pb-10 pt-16 sm:px-8">
      <h1 className="font-display text-[clamp(2.8rem,6vw,6rem)] leading-[0.9] tracking-[0.03em]">
        A4 <span className="text-[var(--accent)]">PRINT</span>
        <br />
        MADE SIMPLE.
      </h1>
      <div className="max-w-sm">
        <p className="mb-5 text-xs leading-7 text-[var(--muted)]">
          Upload your documents, set your options per file, and place your order. Fast turnaround, clean results.
        </p>

        <div className={`queue-hero-card ${pulse ? "queue-hero-pulse" : ""}`}>
          <p className="queue-hero-label">Live Queue</p>

          {isLoadingQueue ? (
            <p className="queue-hero-loading">Checking queue...</p>
          ) : queueError ? (
            <>
              <div className="queue-hero-metric-row">
                <span className="queue-hero-metric-label">Users pending</span>
                <span className="queue-hero-metric-value">{queue.peopleAhead}</span>
              </div>
              <div className="queue-hero-metric-row">
                <span className="queue-hero-metric-label">Estimated wait</span>
                <span className="queue-hero-metric-value">{formatEta(queue.estimatedSeconds)}</span>
              </div>
              <p className="queue-hero-error">{queueError}</p>
            </>
          ) : (
            <>
              <div className="queue-hero-metric-row">
                <span className="queue-hero-metric-label">Users pending</span>
                <span className="queue-hero-metric-value">{queue.peopleAhead}</span>
              </div>
              <div className="queue-hero-metric-row">
                <span className="queue-hero-metric-label">Estimated wait</span>
                <span className="queue-hero-metric-value">{formatEta(queue.estimatedSeconds)}</span>
              </div>
              <p className="queue-hero-footnote">Auto-updating every 4s</p>
            </>
          )}
        </div>

        <a className="btn-accent mt-5" href="#upload">
          Upload Files
        </a>
      </div>
    </section>
  );
}

export default Hero;
