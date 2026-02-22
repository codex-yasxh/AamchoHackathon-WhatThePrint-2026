function ContactSection({ customer, setCustomer }) {
  return (
    <section id="contact">
      <p className="sec-label">Step 03 - Contact Details</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Full Name</label>
          <input
            className="field"
            type="text"
            value={customer.name}
            onChange={(event) => setCustomer((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="field-label">Email</label>
          <input
            className="field"
            type="email"
            value={customer.email}
            onChange={(event) => setCustomer((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="you@email.com"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <div>
          <label className="field-label">Phone (Optional)</label>
          <input
            className="field"
            type="tel"
            value={customer.phone}
            onChange={(event) => setCustomer((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="+91 98765 43210"
          />
        </div>

        <div>
          <label className="field-label">Notes (Optional)</label>
          <textarea
            className="field min-h-[96px]"
            value={customer.notes}
            onChange={(event) => setCustomer((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Any special print instructions"
          />
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
