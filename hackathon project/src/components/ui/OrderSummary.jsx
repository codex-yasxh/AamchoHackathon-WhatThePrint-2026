import { capitalize, formatINR, getPaperLabel } from "../../utils/printUtils";

function OrderSummary({ filesCount, paper, colour, sides, binding, totalPages, pageRate, bindingCost, totalAmount }) {
  return (
    <aside className="px-4 py-10 lg:sticky lg:top-14 lg:max-h-[calc(100vh-56px)] lg:overflow-y-auto lg:px-7">
      <h3 className="summary-title">Order Summary</h3>
      <div className="summary-row">
        <span>Format</span>
        <span>A4 (210 x 297mm)</span>
      </div>
      <div className="summary-row">
        <span>Paper</span>
        <span>{getPaperLabel(paper)}</span>
      </div>
      <div className="summary-row">
        <span>Colour</span>
        <span>{colour === "colour" ? "Full Colour" : "Black & White"}</span>
      </div>
      <div className="summary-row">
        <span>Sides</span>
        <span>{sides === "double" ? "Double-sided" : "Single-sided"}</span>
      </div>
      <div className="summary-row">
        <span>Binding</span>
        <span>{capitalize(binding)}</span>
      </div>
      <div className="summary-row">
        <span>Files</span>
        <span>{filesCount} file{filesCount === 1 ? "" : "s"}</span>
      </div>
      <div className="summary-row">
        <span>Total Print Pages</span>
        <span>{totalPages}</span>
      </div>
      <div className="summary-row">
        <span>Rate / Page</span>
        <span>{formatINR(pageRate)}</span>
      </div>
      <div className="summary-row">
        <span>Binding Charge</span>
        <span>{formatINR(bindingCost)}</span>
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-[var(--border)] pt-4">
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Total</span>
        <span className="font-display text-4xl leading-none text-[var(--accent)]">{formatINR(totalAmount)}</span>
      </div>
      <button
        className="mt-6 w-full rounded-[10px] bg-[var(--accent)] py-3 font-display text-lg tracking-[0.2em] text-[#0d0d0d] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!filesCount}
        type="button"
      >
        Place Order
      </button>
      <p className="mt-3 text-center text-[11px] leading-6 text-[var(--muted)]">A4 format only · Prices include GST</p>
    </aside>
  );
}

export default OrderSummary;
