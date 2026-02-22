import { useEffect, useMemo, useState } from "react";
import ContactSection from "./components/sections/ContactSection";
import PrintOptionsSection from "./components/sections/PrintOptionsSection";
import UploadSection from "./components/sections/UploadSection";
import Header from "./components/ui/Header";
import Hero from "./components/ui/Hero";
import OrderSummary from "./components/ui/OrderSummary";
import AdminPage from "./components/pages/AdminPage";
import { ALLOWED_EXTENSIONS, RATES } from "./constants/printConfig";
import { getBindingCost, getPaperRate, guessPages } from "./utils/printUtils";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

function App() {
  const [files, setFiles] = useState([]);
  const [paper, setPaper] = useState("plain");
  const [colour, setColour] = useState("bw");
  const [sides, setSides] = useState("single");
  const [binding, setBinding] = useState("none");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });
  const [trackedJob, setTrackedJob] = useState(null);

  const paperRate = getPaperRate(paper, RATES);
  const colourRate = colour === "colour" ? RATES.colour : 0;
  const pageRate = RATES.bw + paperRate + colourRate;
  const bindingCost = getBindingCost(binding, RATES);

  const totalPages = useMemo(() => files.reduce((sum, item) => sum + item.pages * item.copies, 0), [files]);
  const totalAmount = totalPages * pageRate + bindingCost;

  const processFiles = (inputFiles) => {
    const newFiles = Array.from(inputFiles || []);
    if (!newFiles.length) return;

    setSubmitMessage({ type: "", text: "" });

    setFiles((prev) => {
      const seen = new Set(prev.map((item) => `${item.name}-${item.size}`));
      const next = [...prev];

      for (const file of newFiles) {
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) continue;

        const key = `${file.name}-${file.size}`;
        if (seen.has(key)) continue;

        next.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: file.name,
          size: file.size,
          ext: ext.replace(".", "").toUpperCase(),
          pages: guessPages(file),
          copies: 1,
          pageRange: "ALL",
          rawFile: file,
        });
        seen.add(key);
      }

      return next;
    });
  };

  const updateCopies = (id, value) => {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, copies: Math.max(1, Number(value) || 1) } : item)),
    );
  };

  const updatePageRange = (id, value) => {
    const normalized = String(value ?? "ALL").trim().replace(/\s+/g, "");
    setFiles((prev) => prev.map((item) => (item.id === id ? { ...item, pageRange: normalized || "ALL" } : item)));
  };

  const removeFile = (id) => setFiles((prev) => prev.filter((item) => item.id !== id));
  const clearFiles = () => setFiles([]);

  useEffect(() => {
    if (!trackedJob?.id) {
      return undefined;
    }

    let isMounted = true;
    let intervalId = null;

    const poll = async () => {
      try {
        const jobRes = await fetch(`${API_BASE_URL}/api/jobs/${trackedJob.id}`);
        const jobPayload = await jobRes.json();

        if (!isMounted) return;

        if (!jobRes.ok || !jobPayload.success) {
          throw new Error(jobPayload.error || "Failed to load job status");
        }

        const nextStatus = jobPayload.data.status;
        let nextPosition = trackedJob.position || 0;
        let nextEstimatedSeconds = trackedJob.estimatedSeconds || 0;
        let nextPollingError = "";

        try {
          const queueRes = await fetch(`${API_BASE_URL}/api/jobs/${trackedJob.id}/queue`);
          const queuePayload = await queueRes.json();

          if (queueRes.ok && queuePayload.success) {
            nextPosition = queuePayload?.data?.position ?? nextPosition;
            nextEstimatedSeconds = queuePayload?.data?.estimated_seconds ?? nextEstimatedSeconds;
          } else {
            nextPollingError = queuePayload.error || "Queue update temporarily unavailable";
          }
        } catch (queueError) {
          nextPollingError = queueError.message || "Queue update temporarily unavailable";
        }

        setTrackedJob((prev) => ({
          ...prev,
          status: nextStatus,
          position: nextPosition,
          estimatedSeconds: nextEstimatedSeconds,
          pollingError: nextPollingError,
        }));

        if (nextStatus === "DONE" || nextStatus === "FAILED") {
          clearInterval(intervalId);
        }
      } catch (error) {
        if (!isMounted) return;

        setTrackedJob((prev) => ({
          ...prev,
          pollingError: error.message || "Live queue update failed",
        }));
      }
    };

    poll();
    intervalId = setInterval(poll, 4000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [trackedJob?.id]);

  // Upload files to backend and create print jobs
  const placeOrder = async () => {
    if (!files.length || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitMessage({ type: "", text: "" });

    try {
      const createdJobIds = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file.rawFile);
        formData.append("copies", String(file.copies || 1));
        formData.append("pageRange", file.pageRange || "ALL");

        const response = await fetch(`${API_BASE_URL}/api/jobs/upload`, {
          method: "POST",
          body: formData,
        });

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Upload failed");
        }

        createdJobIds.push(payload.data.id);
      }

      setSubmitMessage({
        type: "success",
        text: `${createdJobIds.length} job(s) created successfully. First job ID: ${createdJobIds[0]}`,
      });

      setTrackedJob({
        id: createdJobIds[0],
        fileName: files[0]?.name || "Uploaded file",
        status: "PENDING",
        position: 0,
        estimatedSeconds: 0,
        pollingError: "",
      });

      clearFiles();
    } catch (error) {
      console.error("[PLACE ORDER ERROR]", error);
      setSubmitMessage({ type: "error", text: error.message || "Failed to place order" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lightweight route split without adding routing library
  if (window.location.pathname === "/admin") {
    return <AdminPage apiBaseUrl={API_BASE_URL} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Header />
      <main className="mx-auto max-w-7xl">
        <Hero apiBaseUrl={API_BASE_URL} />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
          <div className="border-b border-[var(--border)] px-4 py-10 lg:border-b-0 lg:border-r lg:px-8">
            <UploadSection
              files={files}
              totalPages={totalPages}
              pageRate={pageRate}
              onProcessFiles={processFiles}
              onUpdateCopies={updateCopies}
              onUpdatePageRange={updatePageRange}
              onRemoveFile={removeFile}
              onClearFiles={clearFiles}
            />

            <PrintOptionsSection
              paper={paper}
              colour={colour}
              sides={sides}
              binding={binding}
              setPaper={setPaper}
              setColour={setColour}
              setSides={setSides}
              setBinding={setBinding}
            />

            <ContactSection customer={customer} setCustomer={setCustomer} />
          </div>

          <OrderSummary
            filesCount={files.length}
            paper={paper}
            colour={colour}
            sides={sides}
            binding={binding}
            totalPages={totalPages}
            pageRate={pageRate}
            bindingCost={bindingCost}
            totalAmount={totalAmount}
            onPlaceOrder={placeOrder}
            isSubmitting={isSubmitting}
            submitMessage={submitMessage}
            trackedJob={trackedJob}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
