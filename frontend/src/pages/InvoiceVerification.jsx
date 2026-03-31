import { useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE : INVOICE VERIFICATION
// Affiche les données extraites par OCR — l'utilisateur peut les vérifier
// et corriger avant confirmation.
//
// Props :
//   ocrData   : { invoiceNumber, invoiceDate, supplierName, totalAmount }
//   onConfirm : (correctedData) => void  — appelée au clic sur "Confirm"
//   onBack    : () => void               — retour à la page principale
// ═══════════════════════════════════════════════════════════════════════════════
export default function InvoiceVerification({ ocrData = {}, onConfirm, onBack }) {

  // Pré-rempli avec les données OCR reçues (ou vide si absent)
  const [form, setForm] = useState({
    invoiceNumber: ocrData.invoiceNumber || "",
    invoiceDate:   ocrData.invoiceDate   || "",
    supplierName:  ocrData.supplierName  || "",
    totalAmount:   ocrData.totalAmount   || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      // Appel backend — adapter l'URL selon votre FastAPI
      await fetch("http://127.0.0.1:8000/invoices/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch (_) {
      // Silencieux si le backend n'est pas encore connecté
    }
    setSubmitting(false);
    if (onConfirm) onConfirm(form);
  };

  // ── Helpers de style ──────────────────────────────────────────────────────
  const inputWrap = (id) => ({
    position: "relative",
    borderRadius: 12,
    border: `1px solid ${focusedField === id ? "rgba(37,99,235,0.55)" : "rgba(255,255,255,0.08)"}`,
    background: focusedField === id ? "rgba(37,99,235,0.04)" : "rgba(255,255,255,0.02)",
    transition: "all 0.25s",
    boxShadow: focusedField === id ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
  });

  const inputStyle = {
    width: "100%",
    padding: "13px 14px 13px 44px",
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#e8f0ff",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: 12,
  };

  const iconWrap = (focused) => ({
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: focused ? "#3b82f6" : "#3a4d72",
    transition: "color 0.25s",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
  });

  // ── Icônes SVG inline ────────────────────────────────────────────────────
  const icons = {
    invoiceNumber: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    ),
    invoiceDate: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    supplierName: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    totalAmount: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  };

  // ── Définition des champs du formulaire ───────────────────────────────────
  const fields = [
    { id: "invoiceNumber", label: "Invoice Number",  placeholder: "e.g. INV-2026-00142", type: "text"   },
    { id: "invoiceDate",   label: "Invoice Date",    placeholder: "e.g. 2026-03-30",     type: "date"   },
    { id: "supplierName",  label: "Supplier Name",   placeholder: "e.g. Auto Parts TN",  type: "text"   },
    { id: "totalAmount",   label: "Total Amount",    placeholder: "e.g. 1 240.00",       type: "text"   },
  ];

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      padding: "80px 28px 60px",
      position: "relative",
      zIndex: 1,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 640 }}>

        {/* ── En-tête de page ─────────────────────────────────────────────── */}
        <div className="fe1" style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            OCR · Invoice Review
          </p>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: "#e8f0ff", marginBottom: 6, letterSpacing: "-0.3px" }}>
            Verify <span style={{ color: "#3b82f6" }}>Invoice</span> Data
          </h1>
          <p style={{ color: "#5a6e99", fontSize: 14, fontWeight: 300 }}>
            Review the extracted fields and correct any errors before saving.
          </p>
        </div>

        {/* ── Note utilisateur ─────────────────────────────────────────────── */}
        <div className="fe2" style={{
          marginBottom: 24,
          padding: "14px 18px",
          borderRadius: 12,
          background: "rgba(37,99,235,0.08)",
          border: "1px solid rgba(37,99,235,0.25)",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}>
          <div style={{ flexShrink: 0, marginTop: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p style={{ fontSize: 13, color: "#93c5fd", fontWeight: 400, lineHeight: 1.6 }}>
            Please review the extracted invoice information below. If any field is incorrect, you can edit it before confirming.
          </p>
        </div>

        {/* ── Carte principale du formulaire ───────────────────────────────── */}
        <div className="fe3 surface-card" style={{ padding: "32px 32px", marginBottom: 20 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,rgba(37,99,235,0.22),rgba(59,130,246,0.14))", border: "1px solid rgba(37,99,235,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "#e8f0ff", marginBottom: 1 }}>Extracted Fields</p>
              <p style={{ fontSize: 11, color: "#3a4d72" }}>Click any field to edit</p>
            </div>
          </div>

          {/* Champs du formulaire */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" }}>
            {fields.map(({ id, label, placeholder, type }) => (
              <div key={id} style={id === "supplierName" ? { gridColumn: "1 / -1" } : {}}>
                <label style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  color: focusedField === id ? "#93c5fd" : "#5a6e99",
                  marginBottom: 8,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  transition: "color 0.25s",
                }}>
                  {label}
                </label>
                <div style={inputWrap(id)}>
                  <div style={iconWrap(focusedField === id)}>
                    {icons[id]}
                  </div>
                  <input
                    type={type}
                    value={form[id]}
                    placeholder={placeholder}
                    onChange={e => handleChange(id, e.target.value)}
                    onFocus={() => setFocusedField(id)}
                    onBlur={() => setFocusedField(null)}
                    style={inputStyle}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Verification Tips ────────────────────────────────────────────── */}
        <div className="fe4 surface-card" style={{
          padding: "20px 24px",
          marginBottom: 28,
          borderLeft: "3px solid rgba(37,99,235,0.5)",
        }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "#e8f0ff", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
            Verification Tips
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "🔢", text: "Check the invoice number carefully — OCR may confuse similar characters (0 / O, 1 / l)." },
              { icon: "📅", text: "Make sure the date is correct and matches the paper invoice format." },
              { icon: "💰", text: "Verify the total amount before confirming — decimal separators may vary." },
            ].map(({ icon, text }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <p style={{ fontSize: 12, color: "#5a6e99", fontWeight: 300, lineHeight: 1.6 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Boutons d'action ─────────────────────────────────────────────── */}
        <div className="fe5" style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>

          {/* Bouton Back */}
          <button
            className="btn-ghost"
            onClick={onBack}
            disabled={submitting}
            style={{
              padding: "12px 28px",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12,19 5,12 12,5"/>
            </svg>
            Back
          </button>

          {/* Bouton Confirm */}
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              padding: "12px 32px",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 20 20" style={{ animation: "spin-ring 0.8s linear infinite" }}>
                  <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5"/>
                  <path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Saving…
              </>
            ) : (
              <>
                Confirm
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}