// ─── src/pages/ExpenseVerificationPage.jsx ──────────────────────────────────
// Page de vérification d'une note de frais après upload OCR.
// Même design que InvoiceVerification.jsx (facture fournisseur).
//
// Props :
//   receiptData : données brutes retournées par POST /receipts/upload
//   onConfirm   : (correctedData) => void — appelée après validation
//   onBack      : () => void              — retour à la page upload

import { useState, useEffect } from "react";

// ── Catégories disponibles (correspondant à expense_categories en BDD) ────────
const CATEGORIES = [
  { code: "restaurant", label: "Restauration",     icon: "🍽️" },
  { code: "cafe",       label: "Café",             icon: "☕" },
  { code: "taxi",       label: "Taxi / VTC",       icon: "🚗" },
  { code: "fuel",       label: "Carburant",        icon: "⛽" },
  { code: "parking",    label: "Parking",          icon: "🅿️" },
  { code: "hotel",      label: "Hébergement",      icon: "🏨" },
  { code: "transport",  label: "Transport",        icon: "🚆" },
  { code: "supermarket",label: "Supermarché",      icon: "🛒" },
  { code: "office",     label: "Fournitures",      icon: "📎" },
  { code: "other",      label: "Autre",            icon: "📋" },
];

// ── Couleur selon résultat de vérification seuil ─────────────────────────────
const thresholdColor = (status) => {
  if (status === "auto_approved") return "#10b981"; // vert
  if (status === "auto_rejected") return "#f87171"; // rouge
  return "#f59e0b";                                  // orange = pending
};

const thresholdLabel = (status) => {
  if (status === "auto_approved") return "✓ Seuil respecté";
  if (status === "auto_rejected") return "⚠ Seuil dépassé";
  return "⏳ En attente d'approbation";
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function ExpenseVerificationPage({ receiptData = {}, onConfirm, onBack }) {

  // ── Lire l'id utilisateur depuis localStorage ─────────────────────────────
  const username = localStorage.getItem("username") || "";

  // ── Pré-remplir le formulaire avec les données OCR reçues ────────────────
  // receiptData vient de process_receipt() → extracted_fields + review_fields
  const extracted = receiptData.extracted_fields || {};
  const review    = receiptData.review_fields    || {};

  const [form, setForm] = useState({
    merchant_name  : extracted.merchant_name  || "",
    receipt_date   : extracted.receipt_date   || "",
    total_amount   : extracted.total_amount   != null ? String(extracted.total_amount) : "",
    currency       : extracted.currency       || "TND",
    payment_method : extracted.payment_method || "",
    category_code  : extracted.category_code  || "other",
    notes          : "",
  });

  const [submitting,    setSubmitting]    = useState(false);
  const [focusedField,  setFocusedField]  = useState(null);

  // ── État de la vérification du seuil ─────────────────────────────────────
  const [threshold,     setThreshold]     = useState(null);   // données seuil backend
  const [thresholdLoad, setThresholdLoad] = useState(false);  // chargement
  const [thresholdErr,  setThresholdErr]  = useState("");     // erreur fetch

  // ── Score de confiance OCR pour chaque champ ─────────────────────────────
  const lowFields = (receiptData.low_confidence_fields || []).map(f => f.field);

  // ─────────────────────────────────────────────────────────────────────────
  // Charger les infos de seuil dès le montage
  // Appel : GET /user-threshold/{username}
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!username) return;
    setThresholdLoad(true);
    fetch(`http://127.0.0.1:8000/admin/user-threshold/${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(data => {
        setThreshold(data);
        setThresholdLoad(false);
      })
      .catch(() => {
        setThresholdErr("Impossible de vérifier le seuil.");
        setThresholdLoad(false);
      });
  }, [username]);

  // ── Vérifier en temps réel si le montant dépasse le seuil ────────────────
  const amount      = parseFloat(form.total_amount) || 0;
  const maxAllowed  = threshold?.max_amount_tnd   || 0;
  const autoApprove = threshold?.auto_approve_below_tnd || 0;

  // Calcul local du statut (en attendant la réponse backend à la sauvegarde)
  const localStatus =
    amount === 0        ? null :
    amount > maxAllowed ? "auto_rejected" :
    amount <= autoApprove ? "auto_approved" : "pending";

  // ─────────────────────────────────────────────────────────────────────────
  // handleChange — met à jour un champ du formulaire
  // ─────────────────────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // handleConfirm — envoie les données corrigées au backend
  // Endpoint : POST /receipts/confirm-review
  // ─────────────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const payload = {
        document_id   : receiptData.document_id,
        merchant_name : form.merchant_name,
        receipt_date  : form.receipt_date  || null,
        total_amount  : parseFloat(form.total_amount) || null,
        currency      : form.currency,
        payment_method: form.payment_method || null,
        category_code : form.category_code,
        notes         : form.notes || null,
      };

      const res = await fetch("http://127.0.0.1:8000/receipts/confirm-review", {
        method  : "POST",
        headers : {
          "Content-Type": "application/json",
          "X-Username"  : username,   // identité utilisateur
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur lors de la sauvegarde");
      }

      const result = await res.json();
      if (onConfirm) onConfirm({ ...form, ...result });

    } catch (err) {
      console.error("Confirm error:", err);
      alert("Erreur : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers de style (identiques à InvoiceVerification)
  // ─────────────────────────────────────────────────────────────────────────
  const inputWrap = (id) => ({
    position  : "relative",
    borderRadius: 12,
    border    : `1px solid ${
      lowFields.includes(id)   ? "rgba(245,158,11,0.5)" :   // orange si faible confiance
      focusedField === id      ? "rgba(37,99,235,0.55)" :   // bleu si focus
      "rgba(255,255,255,0.08)"                              // défaut
    }`,
    background: focusedField === id ? "rgba(37,99,235,0.04)" : "rgba(255,255,255,0.02)",
    transition: "all 0.25s",
    boxShadow : focusedField === id ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
  });

  const inputStyle = {
    width: "100%", padding: "13px 14px 13px 44px",
    background: "transparent", border: "none", outline: "none",
    color: "#e8f0ff", fontSize: 14,
    fontFamily: "'DM Sans', sans-serif", borderRadius: 12,
  };

  const iconWrap = (focused) => ({
    position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
    color: focused ? "#3b82f6" : "#3a4d72",
    transition: "color 0.25s", pointerEvents: "none",
    display: "flex", alignItems: "center",
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", padding: "80px 28px 60px",
      position: "relative", zIndex: 1,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 660 }}>

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div className="fe1" style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            OCR · Note de frais
          </p>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: "#e8f0ff", marginBottom: 6, letterSpacing: "-0.3px" }}>
            Vérifier la <span style={{ color: "#10b981" }}>note de frais</span>
          </h1>
          <p style={{ color: "#5a6e99", fontSize: 14, fontWeight: 300 }}>
            Vérifiez et corrigez les champs extraits par OCR avant de valider.
          </p>
        </div>

        {/* ── Note info ───────────────────────────────────────────────────── */}
        <div className="fe2" style={{
          marginBottom: 20, padding: "14px 18px", borderRadius: 12,
          background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.22)",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#10b981" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize: 13, color: "#6ee7b7", fontWeight: 400, lineHeight: 1.6 }}>
            Les champs avec un <span style={{ color: "#f59e0b", fontWeight: 600 }}>contour orange</span> ont une faible confiance OCR — vérifiez-les attentivement.
          </p>
        </div>

        {/* ── Bloc seuil ──────────────────────────────────────────────────── */}
        <div className="fe2" style={{ marginBottom: 20 }}>
          {thresholdLoad && (
            <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 13, color: "#5a6e99" }}>
              Vérification du seuil en cours…
            </div>
          )}

          {!thresholdLoad && thresholdErr && (
            <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)", fontSize: 13, color: "#f87171" }}>
              {thresholdErr}
            </div>
          )}

          {!thresholdLoad && threshold && localStatus && (
            <div style={{
              padding: "14px 20px", borderRadius: 12,
              background: localStatus === "auto_rejected"
                ? "rgba(248,113,113,0.07)"
                : localStatus === "auto_approved"
                  ? "rgba(16,185,129,0.07)"
                  : "rgba(245,158,11,0.07)",
              border: `1px solid ${thresholdColor(localStatus)}44`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              {/* Statut du seuil */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: `${thresholdColor(localStatus)}18`,
                  border: `1px solid ${thresholdColor(localStatus)}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>
                  {localStatus === "auto_approved" ? "✓" : localStatus === "auto_rejected" ? "⚠" : "⏳"}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: thresholdColor(localStatus), marginBottom: 2 }}>
                    {thresholdLabel(localStatus)}
                  </p>
                  <p style={{ fontSize: 11, color: "#5a6e99" }}>
                    Seuil max : <strong style={{ color: "#e8f0ff" }}>{maxAllowed.toFixed(3)} TND</strong>
                    {" · "}Auto-approbation : <strong style={{ color: "#e8f0ff" }}>{autoApprove.toFixed(3)} TND</strong>
                  </p>
                </div>
              </div>

              {/* Montant actuel */}
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: thresholdColor(localStatus), fontFamily: "'Syne',sans-serif" }}>
                  {amount > 0 ? `${amount.toFixed(3)} ${form.currency}` : "—"}
                </p>
                <p style={{ fontSize: 10, color: "#5a6e99" }}>Montant saisi</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Formulaire principal ─────────────────────────────────────────── */}
        <div className="fe3 surface-card" style={{ padding: "32px 32px", marginBottom: 20 }}>

          {/* En-tête formulaire */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,rgba(16,185,129,0.2),rgba(16,185,129,0.1))", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "#e8f0ff", marginBottom: 1 }}>
                Champs extraits
              </p>
              <p style={{ fontSize: 11, color: "#3a4d72" }}>Cliquez sur un champ pour le modifier</p>
            </div>
          </div>

          {/* ── Grille des champs ──────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" }}>

            {/* Fournisseur / Marchand — pleine largeur */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: focusedField === "merchant_name" ? "#6ee7b7" : "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.25s" }}>
                Fournisseur / Marchand
                {lowFields.includes("merchant_name") && <span style={{ color: "#f59e0b", marginLeft: 6 }}>⚠ faible confiance</span>}
              </label>
              <div style={inputWrap("merchant_name")}>
                <div style={iconWrap(focusedField === "merchant_name")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9,22 9,12 15,12 15,22"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={form.merchant_name}
                  placeholder="ex: Uber, Restaurant Le Bon Coin"
                  onChange={e => handleChange("merchant_name", e.target.value)}
                  onFocus={() => setFocusedField("merchant_name")}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: focusedField === "receipt_date" ? "#6ee7b7" : "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.25s" }}>
                Date
                {lowFields.includes("receipt_date") && <span style={{ color: "#f59e0b", marginLeft: 6 }}>⚠</span>}
              </label>
              <div style={inputWrap("receipt_date")}>
                <div style={iconWrap(focusedField === "receipt_date")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <input
                  type="date"
                  value={form.receipt_date}
                  onChange={e => handleChange("receipt_date", e.target.value)}
                  onFocus={() => setFocusedField("receipt_date")}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Montant total */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: focusedField === "total_amount" ? "#6ee7b7" : "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.25s" }}>
                Montant total
                {lowFields.includes("total_amount") && <span style={{ color: "#f59e0b", marginLeft: 6 }}>⚠</span>}
              </label>
              <div style={inputWrap("total_amount")}>
                <div style={iconWrap(focusedField === "total_amount")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.total_amount}
                  placeholder="ex: 45.000"
                  onChange={e => handleChange("total_amount", e.target.value)}
                  onFocus={() => setFocusedField("total_amount")}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Devise */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Devise
              </label>
              <div style={{ ...inputWrap("currency"), padding: "2px 0" }}>
                <div style={iconWrap(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <select
                  value={form.currency}
                  onChange={e => handleChange("currency", e.target.value)}
                  onFocus={() => setFocusedField("currency")}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...inputStyle, padding: "13px 14px 13px 44px", cursor: "pointer" }}
                >
                  {["TND","EUR","USD","GBP","CHF","TRY","MAD"].map(c => (
                    <option key={c} value={c} style={{ background: "#0d1627" }}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Moyen de paiement */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Moyen de paiement
              </label>
              <div style={inputWrap("payment_method")}>
                <div style={iconWrap(focusedField === "payment_method")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="1" y="4" width="22" height="16" rx="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <select
                  value={form.payment_method}
                  onChange={e => handleChange("payment_method", e.target.value)}
                  onFocus={() => setFocusedField("payment_method")}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">— Non spécifié —</option>
                  <option value="cash">Espèces</option>
                  <option value="card">Carte bancaire</option>
                  <option value="cheque">Chèque</option>
                  <option value="virement">Virement</option>
                </select>
              </div>
            </div>

            {/* Catégorie — pleine largeur */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5a6e99", marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Catégorie
              </label>
              {/* Grille de boutons catégorie */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.code}
                    onClick={() => handleChange("category_code", cat.code)}
                    style={{
                      padding: "7px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                      transition: "all 0.2s",
                      background: form.category_code === cat.code
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(255,255,255,0.03)",
                      border: form.category_code === cat.code
                        ? "1px solid rgba(16,185,129,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                      color: form.category_code === cat.code ? "#6ee7b7" : "#5a6e99",
                      fontWeight: form.category_code === cat.code ? 600 : 400,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes — pleine largeur */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Notes (optionnel)
              </label>
              <textarea
                value={form.notes}
                placeholder="Contexte, motif de la dépense…"
                onChange={e => handleChange("notes", e.target.value)}
                onFocus={() => setFocusedField("notes")}
                onBlur={() => setFocusedField(null)}
                rows={3}
                style={{
                  width: "100%", padding: "12px 14px",
                  background: focusedField === "notes" ? "rgba(37,99,235,0.04)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${focusedField === "notes" ? "rgba(37,99,235,0.55)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 12, outline: "none", color: "#e8f0ff", fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif", resize: "vertical",
                  transition: "all 0.25s", boxSizing: "border-box",
                }}
              />
            </div>

          </div>
        </div>

        {/* ── Conseils vérification ────────────────────────────────────────── */}
        <div className="fe4 surface-card" style={{ padding: "20px 24px", marginBottom: 28, borderLeft: "3px solid rgba(16,185,129,0.5)" }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "#e8f0ff", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
            Conseils de vérification
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "🔢", text: "Vérifiez le montant total — les séparateurs décimaux varient selon les pays (. ou ,)." },
              { icon: "📅", text: "Confirmez la date — elle détermine la période de remboursement." },
              { icon: "🏪", text: "Le nom du marchand doit être exact pour le rapprochement comptable." },
              { icon: "⚠️",  text: "Les champs en orange ont été extraits avec moins de certitude par l'OCR." },
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

          {/* Bouton Retour */}
          <button
            className="btn-ghost"
            onClick={onBack}
            disabled={submitting}
            style={{ padding: "12px 28px", fontSize: 14, display: "flex", alignItems: "center", gap: 8, fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12,19 5,12 12,5"/>
            </svg>
            Retour
          </button>

          {/* Bouton Valider */}
          <button
            onClick={handleConfirm}
            disabled={submitting || !form.merchant_name || !form.total_amount}
            style={{
              padding: "12px 32px", fontSize: 14, borderRadius: 12, cursor: "pointer",
              fontFamily: "'Syne', sans-serif", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg,#059669,#10b981)",
              border: "none", color: "white",
              boxShadow: "0 8px 28px rgba(16,185,129,0.35)",
              opacity: (submitting || !form.merchant_name || !form.total_amount) ? 0.6 : 1,
              transition: "all 0.25s",
            }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {submitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 20 20" style={{ animation: "spin-ring 0.8s linear infinite" }}>
                  <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                  <path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Enregistrement…
              </>
            ) : (
              <>
                Valider et enregistrer
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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