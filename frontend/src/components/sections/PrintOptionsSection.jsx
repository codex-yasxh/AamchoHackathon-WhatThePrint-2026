function PrintOptionsSection({ paper, colour, sides, binding, setPaper, setColour, setSides, setBinding }) {
  return (
    <section id="configure" className="mb-10">
      <p className="sec-label">Step 02 - Print Options</p>
      <h3 className="config-title">Paper &amp; Colour</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Paper Type</label>
          <select className="field" value={paper} onChange={(event) => setPaper(event.target.value)}>
            <option value="plain">Plain 75gsm</option>
            <option value="matte">Matte 90gsm (+\u20B91/pg)</option>
            <option value="glossy">Glossy 120gsm (+\u20B92/pg)</option>
          </select>
        </div>
        <div>
          <label className="field-label">Colour</label>
          <div className="grid grid-cols-2 gap-2">
            <button className={`radio-btn ${colour === "bw" ? "radio-active" : ""}`} onClick={() => setColour("bw")} type="button">
              B&amp;W
            </button>
            <button className={`radio-btn ${colour === "colour" ? "radio-active" : ""}`} onClick={() => setColour("colour")} type="button">
              Colour
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Sides</label>
          <div className="grid grid-cols-2 gap-2">
            <button className={`radio-btn ${sides === "single" ? "radio-active" : ""}`} onClick={() => setSides("single")} type="button">
              Single
            </button>
            <button className={`radio-btn ${sides === "double" ? "radio-active" : ""}`} onClick={() => setSides("double")} type="button">
              Double
            </button>
          </div>
        </div>

        <div>
          <label className="field-label">Binding</label>
          <div className="grid grid-cols-3 gap-2">
            <button className={`radio-btn ${binding === "none" ? "radio-active" : ""}`} onClick={() => setBinding("none")} type="button">
              None
            </button>
            <button className={`radio-btn ${binding === "staple" ? "radio-active" : ""}`} onClick={() => setBinding("staple")} type="button">
              Staple
            </button>
            <button className={`radio-btn ${binding === "spiral" ? "radio-active" : ""}`} onClick={() => setBinding("spiral")} type="button">
              Spiral
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PrintOptionsSection;
