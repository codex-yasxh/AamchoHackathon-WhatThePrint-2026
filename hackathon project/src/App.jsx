import { useMemo, useState } from "react";
import ContactSection from "./components/sections/ContactSection";
import PrintOptionsSection from "./components/sections/PrintOptionsSection";
import UploadSection from "./components/sections/UploadSection";
import Header from "./components/ui/Header";
import Hero from "./components/ui/Hero";
import OrderSummary from "./components/ui/OrderSummary";
import { ALLOWED_EXTENSIONS, RATES } from "./constants/printConfig";
import { getBindingCost, getPaperRate, guessPages } from "./utils/printUtils";

function App() {
  const [files, setFiles] = useState([]);
  const [paper, setPaper] = useState("plain");
  const [colour, setColour] = useState("bw");
  const [sides, setSides] = useState("single");
  const [binding, setBinding] = useState("none");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", notes: "" });

  const paperRate = getPaperRate(paper, RATES);
  const colourRate = colour === "colour" ? RATES.colour : 0;
  const pageRate = RATES.bw + paperRate + colourRate;
  const bindingCost = getBindingCost(binding, RATES);

  const totalPages = useMemo(() => files.reduce((sum, item) => sum + item.pages * item.copies, 0), [files]);
  const totalAmount = totalPages * pageRate + bindingCost;

  const processFiles = (inputFiles) => {
    const newFiles = Array.from(inputFiles || []);
    if (!newFiles.length) return;

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

  const removeFile = (id) => setFiles((prev) => prev.filter((item) => item.id !== id));
  const clearFiles = () => setFiles([]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Header />
      <main className="mx-auto max-w-7xl">
        <Hero />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
          <div className="border-b border-[var(--border)] px-4 py-10 lg:border-b-0 lg:border-r lg:px-8">
            <UploadSection
              files={files}
              totalPages={totalPages}
              pageRate={pageRate}
              onProcessFiles={processFiles}
              onUpdateCopies={updateCopies}
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
          />
        </div>
      </main>
    </div>
  );
}

export default App;
