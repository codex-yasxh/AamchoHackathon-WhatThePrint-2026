import { formatINR } from "../../utils/printUtils";

const FILE_CHIPS = ["PDF", "DOCX", "PNG", "JPEG", "TIFF"];

function UploadSection({
  files,
  totalPages,
  pageRate,
  onProcessFiles,
  onUpdateCopies,
  onUpdatePageRange,
  onRemoveFile,
  onClearFiles,
}) {
  const onDrop = (event) => {
    event.preventDefault();
    onProcessFiles(event.dataTransfer.files);
  };

  return (
    <section id="upload" className="mb-10">
      <p className="sec-label">Step 01 - Upload Files</p>
      <label className="upload-zone" onDrop={onDrop} onDragOver={(event) => event.preventDefault()}>
        <h3 className="font-display text-2xl tracking-[0.1em]">Drag &amp; Drop Files Here</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">or click to browse · A4 documents only</p>
        <span className="btn-outline mt-4 inline-block">Browse Files</span>
        <input
          className="hidden"
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.tiff,.tif"
          onChange={(event) => {
            onProcessFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <div className="mt-4 flex flex-wrap justify-center gap-1">
          {FILE_CHIPS.map((chip) => (
            <span key={chip} className="chip">
              {chip}
            </span>
          ))}
        </div>
      </label>

      {files.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-[10px] border border-[var(--border)]">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="border-b border-[var(--border)] text-[var(--muted)]">
              <tr>
                <th className="p-2 text-left font-normal">#</th>
                <th className="p-2 text-left font-normal">File Name</th>
                <th className="p-2 text-left font-normal">Type</th>
                <th className="p-2 text-left font-normal">Pages</th>
                <th className="p-2 text-left font-normal">Copies</th>
                <th className="p-2 text-left font-normal">Print Pages</th>
                <th className="p-2 text-right font-normal">Subtotal</th>
                <th className="p-2 text-center font-normal">X</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, index) => {
                const isAllPages = (file.pageRange || "ALL").toUpperCase() === "ALL";

                return (
                  <tr key={file.id} className="border-b border-[var(--line)] bg-[var(--surface)] align-top">
                    <td className="p-2 text-[var(--muted)]">{index + 1}</td>
                    <td className="max-w-[260px] truncate p-2">{file.name}</td>
                    <td className="p-2 text-[var(--accent)]">{file.ext}</td>
                    <td className="p-2">{file.pages}p</td>
                    <td className="p-2">
                      <div className="flex w-fit items-center">
                        <button className="copy-btn" type="button" onClick={() => onUpdateCopies(file.id, file.copies - 1)}>
                          -
                        </button>
                        <input
                          className="copy-input"
                          type="number"
                          min="1"
                          value={file.copies}
                          onChange={(event) => onUpdateCopies(file.id, event.target.value)}
                        />
                        <button className="copy-btn" type="button" onClick={() => onUpdateCopies(file.id, file.copies + 1)}>
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`pages-${file.id}`}
                            checked={isAllPages}
                            onChange={() => onUpdatePageRange(file.id, "ALL")}
                          />
                          <span>All Pages</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`pages-${file.id}`}
                            checked={!isAllPages}
                            onChange={() => onUpdatePageRange(file.id, file.pageRange === "ALL" ? "1-1" : file.pageRange)}
                          />
                          <span>Custom Range:</span>
                        </label>
                        {!isAllPages && (
                          <input
                            className="w-full rounded-[6px] border border-[var(--border)] bg-transparent px-2 py-1 text-xs text-[var(--text)] outline-none"
                            type="text"
                            value={file.pageRange === "ALL" ? "" : file.pageRange}
                            onChange={(event) => onUpdatePageRange(file.id, event.target.value)}
                            placeholder="1-3 or 2,4,6"
                          />
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-right">{formatINR(file.pages * file.copies * pageRate)}</td>
                    <td className="p-2 text-center">
                      <button
                        className="text-[var(--muted)] transition hover:text-[var(--danger)]"
                        type="button"
                        onClick={() => onRemoveFile(file.id)}
                      >
                        x
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex items-center justify-between bg-[var(--surface-strong)] px-3 py-2 text-[11px] text-[var(--muted)]">
            <span>
              <strong className="text-[var(--text)]">{files.length}</strong> files ·{" "}
              <strong className="text-[var(--text)]">{totalPages}</strong> total print pages
            </span>
            <button className="btn-outline text-[11px]" type="button" onClick={onClearFiles}>
              Clear All
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default UploadSection;
