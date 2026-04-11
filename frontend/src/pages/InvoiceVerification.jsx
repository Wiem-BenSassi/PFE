// ─── src/pages/InvoiceVerification.jsx ──────────────────────────────────────
// CONNEXION BACKEND COMPLÈTE :
//
//   • POST /invoices/upload          → ré-upload depuis cette page
//   • PATCH /invoices/{id}/validate  → validation des données corrigées (CORRECTION PRINCIPALE)
//     ↳ endpoint correct : /invoices/{document_id}/validate  (pas /invoices/verify)
//
// GESTION DES SEUILS :
//   • Le backend retourne requires_validation dans extracted_invoices[0].needs_review
//   • Si needs_review = true  → l'utilisateur DOIT vérifier manuellement avant de confirmer
//   • Si needs_review = false → validation automatique après confirmation
//
// VÉRIFICATION BUDGET :
//   • Avant la confirmation, on vérifie le budget avec le montant de la facture ← AJOUTÉ
//   • Si budget bloqué → erreur affichée, confirmation refusée
//   • Si warning → message affiché mais on continue
//
// ERREURS GÉRÉES :
//   • 400 — fichier invalide / type non accepté
//   • 403 — rôle insuffisant
//   • 404 — facture non trouvée en base
//   • 500 — erreur serveur
//   • Réseau hors ligne
//   • Doublon de fichier
//   • Mauvais type de document (note de frais vs facture fournisseur)

import { useState, useRef } from "react";
import { useBudget } from "../hooks/useBudget";   // ← AJOUTÉ

// ── Constantes ────────────────────────────────────────────────────────────────
const BASE_URL    = "http://127.0.0.1:8000";
const CURRENCIES  = ["TND", "EUR", "USD", "GBP", "CHF", "TRY", "MAD"];
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

// ── Mots-clés de détection de type de document ────────────────────────────────
const INVOICE_KEYWORDS = [
  "invoice", "facture", "fournisseur", "supplier", "tva", "vat", "siret",
  "bon de commande", "purchase order", "proforma", "numéro de facture",
  "invoice number", "inv-", "htva", "ht", "ttc", "hors taxe",
  "conditions de paiement", "payment terms", "matricule fiscal",
];
const RECEIPT_KEYWORDS = [
  "ticket", "reçu", "receipt", "caisse", "restaurant", "carburant", "fuel",
  "essence", "parking", "taxi", "uber", "bolt", "café", "coffee",
  "supermarché", "supermarket", "merci de votre visite", "ticket de caisse",
  "note de frais", "expense", "visa", "mastercard", "carte bancaire", "hotel",
];

export function detectDocumentType(rawText = "", supplierName = "", invoiceNumber = "") {
  const text = [rawText, supplierName, invoiceNumber].join(" ").toLowerCase();
  let invoiceScore = 0, receiptScore = 0;
  INVOICE_KEYWORDS.forEach(kw => { if (text.includes(kw)) invoiceScore++; });
  RECEIPT_KEYWORDS.forEach(kw => { if (text.includes(kw)) receiptScore++; });
  if (/\b(inv|fac|fact|invoice|facture)[\s-]?\d+/i.test(text)) invoiceScore += 3;
  if (/\b\d{14}\b/.test(text) || /siret/i.test(text)) invoiceScore += 4;
  if (/total\s*ttc/i.test(text) && invoiceScore < 2) receiptScore += 2;
  if (invoiceScore === 0 && receiptScore === 0) return { type: "unknown", invoiceScore, receiptScore };
  if (invoiceScore >= receiptScore) return { type: "invoice", invoiceScore, receiptScore };
  return { type: "receipt", invoiceScore, receiptScore };
}

// ── Toast inline ──────────────────────────────────────────────────────────────
const AlertBanner = ({ type, message, onClose }) => {
  const isSuccess = type === "success";
  const isWarning = type === "warning";
  const color = isSuccess ? "#10b981" : isWarning ? "#f59e0b" : "#f87171";
  const bg    = isSuccess ? "rgba(16,185,129,0.08)" : isWarning ? "rgba(245,158,11,0.08)" : "rgba(248,113,113,0.08)";
  const border = isSuccess ? "rgba(16,185,129,0.3)" : isWarning ? "rgba(245,158,11,0.3)" : "rgba(248,113,113,0.35)";
  return (
    <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "flex-start", gap: 12, animation: "fade-in 0.3s ease" }}>
      {isSuccess
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20,6 9,17 4,12"/></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, color, fontWeight: 500, lineHeight: 1.5 }}>{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color, padding: 0, flexShrink: 0, opacity: 0.7 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function InvoiceVerification({ ocrData = {}, onConfirm, onBack }) {

  const username = localStorage.getItem("username") || "";

  // ← AJOUTÉ : hook budget pour vérification avant confirmation
  const { checkBudget, isBudgetBlocked } = useBudget();

  // ── Formulaire pré-rempli avec les données OCR ────────────────────────────
  const [form, setForm] = useState({
    invoiceNumber: ocrData.invoiceNumber || ocrData.invoice_number || "",
    invoiceDate:   ocrData.invoiceDate   || ocrData.invoice_date   || "",
    supplierName:  ocrData.supplierName  || ocrData.supplier_name  || "",
    totalAmount:   ocrData.totalAmount   || ocrData.total_amount   || ocrData.total_ttc || "",
    currency:      ocrData.currency      || "TND",
  });

  // ── IDs backend pour les appels PATCH ─────────────────────────────────────
  // Ces IDs arrivent depuis UploadPage via ocrData (ajoutés dans le mapping)
  const documentId = ocrData.document_id || null;

  // ── États UI ──────────────────────────────────────────────────────────────
  const [submitting,   setSubmitting]   = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [uploadError,  setUploadError]  = useState("");
  const [uploadWarning,setUploadWarning]= useState("");
  const [uploading,    setUploading]    = useState(false);
  const [successMsg,   setSuccessMsg]   = useState("");
  const [submitError,  setSubmitError]  = useState("");

  const fileInputRef = useRef(null);

  // ── Seuil : le backend signale needs_review via l'OCR ────────────────────
  // Si true → validation manuelle obligatoire (l'utilisateur doit corriger et confirmer)
  // Si false → on peut confirmer directement et le backend valide automatiquement
  const needsReview = ocrData.needs_review ?? true;
  const extractionScore = ocrData.extraction_confidence ?? 0;

  // ── Détection du type du document initial ─────────────────────────────────
  const initialDetection = detectDocumentType(
    ocrData.raw_text     || "",
    ocrData.supplierName || ocrData.supplier_name || "",
    ocrData.invoiceNumber || ocrData.invoice_number || "",
  );

  // ── handleChange ──────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ── handleNewFileUpload — ré-upload depuis cette page ─────────────────────
  const handleNewFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadWarning("");

    if (!ALLOWED_MIME.includes(file.type)) {
      setUploadError("Type de fichier non accepté. Utilisez PDF, JPG ou PNG.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("Fichier trop grand. Taille maximale : 20 Mo.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("file_type", "supplier_invoice");

      const res = await fetch(`${BASE_URL}/invoices/upload`, {
        method  : "POST",
        headers : { "X-Username": username },
        body    : formData,
      });

      if (res.status === 403) throw new Error("Accès refusé — rôle Comptabilité requis.");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();

      if (data.status === "duplicate") {
        setUploadError("Ce fichier a déjà été uploadé (doublon détecté).");
        e.target.value = "";
        setUploading(false);
        return;
      }
      if (data.status === "error") {
        throw new Error("L'OCR a échoué — vérifiez la qualité du document.");
      }

      // Récupération du premier résultat
      const firstInvoice = data.extracted_invoices?.[0]?.fields || {};

      // Détection du type de document
      const detection = detectDocumentType(
        data.raw_text || "",
        firstInvoice.supplier_name || "",
        firstInvoice.invoice_number || "",
      );

      if (detection.type === "receipt") {
        setUploadError(
          "⛔ Document refusé : ce fichier semble être une note de frais, pas une facture fournisseur. " +
          "Seules les factures fournisseurs sont autorisées ici."
        );
        e.target.value = "";
        setUploading(false);
        return;
      }

      if (detection.type === "unknown") {
        setUploadWarning("⚠ Type de document incertain — vérifiez attentivement que c'est bien une facture fournisseur.");
      }

      // Mise à jour du formulaire
      setForm({
        invoiceNumber: firstInvoice.invoice_number ?? "",
        invoiceDate:   firstInvoice.invoice_date   ?? "",
        supplierName:  firstInvoice.supplier_name  ?? "",
        totalAmount:   firstInvoice.total_ttc ?? firstInvoice.total_amount ?? "",
        currency:      firstInvoice.currency  ?? "TND",
      });

    } catch (err) {
      setUploadError("Erreur lors de l'upload : " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ── handleConfirm — CONNEXION BACKEND RÉELLE ──────────────────────────────
  //
  // CORRECTION PRINCIPALE :
  //   L'ancienne version appelait POST /invoices/verify (endpoint inexistant).
  //   La bonne route est : PATCH /invoices/{document_id}/validate
  //
  // Payload attendu par le backend (InvoiceValidationPayload) :
  //   invoice_number, invoice_date, supplier_name,
  //   total_ttc, currency, action: "validate"
  //
  const handleConfirm = async () => {
    if (uploadError) return;
    setSubmitting(true);
    setSubmitError("");
    setSuccessMsg("");

    try {
      // ← AJOUTÉ : Vérification budget avec le montant de la facture
      if (form.totalAmount) {
        const budgetCheck = await checkBudget(parseFloat(form.totalAmount), "supplier_invoice");
        if (!budgetCheck.allowed) {
          setSubmitError(budgetCheck.message);
          setSubmitting(false);
          return;
        }
        if (budgetCheck.alert_level === "warning") {
          setUploadWarning(budgetCheck.message);
          // On continue quand même (juste un warning)
        }
      }

      // ── Cas sans document_id : pas de connexion backend (mode démo) ───────
      if (!documentId) {
        console.warn("Aucun document_id — la validation backend est ignorée (mode démo).");
        await new Promise(r => setTimeout(r, 600));
        setSuccessMsg("Données enregistrées (mode démo — backend non connecté).");
        setTimeout(() => { if (onConfirm) onConfirm(form); }, 1200);
        setSubmitting(false);
        return;
      }

      // ── Appel PATCH /invoices/{document_id}/validate ──────────────────────
      const payload = {
        invoice_number  : form.invoiceNumber || undefined,
        invoice_date    : form.invoiceDate   || undefined,
        supplier_name   : form.supplierName  || undefined,
        total_ttc       : form.totalAmount   ? parseFloat(form.totalAmount) : undefined,
        currency        : form.currency      || "TND",
        action          : "validate",
      };

      const res = await fetch(`${BASE_URL}/invoices/${documentId}/validate`, {
        method  : "PATCH",
        headers : {
          "Content-Type": "application/json",
          "X-Username"  : username,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 403) throw new Error("Accès refusé — rôle Comptabilité requis pour valider.");
      if (res.status === 404) throw new Error("Facture introuvable en base de données.");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur serveur (${res.status})`);
      }

      const result = await res.json();

      // ── Gestion du statut de validation ───────────────────────────────────
      // Le backend renvoie : { status: "validated"|"pending", message, ... }
      if (result.status === "validated") {
        setSuccessMsg("✅ Facture validée et enregistrée avec succès !");
        setTimeout(() => { if (onConfirm) onConfirm({ ...form, document_id: documentId }); }, 1000);
      } else {
        // needs_review → en attente de validation manuelle supplémentaire
        setSuccessMsg("📋 Facture enregistrée — en attente de validation manuelle.");
        setTimeout(() => { if (onConfirm) onConfirm({ ...form, document_id: documentId }); }, 1000);
      }

    } catch (err) {
      console.error("Confirmation error:", err);
      if (err.message === "Failed to fetch") {
        setSubmitError("Impossible de contacter le serveur. Vérifiez que le backend est démarré sur http://127.0.0.1:8000");
      } else {
        setSubmitError(err.message || "Une erreur est survenue lors de la validation.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── handleReject ──────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!documentId) { if (onBack) onBack(); return; }
    setSubmitting(true);
    try {
      await fetch(`${BASE_URL}/invoices/${documentId}/validate`, {
        method  : "PATCH",
        headers : { "Content-Type": "application/json", "X-Username": username },
        body    : JSON.stringify({ action: "reject", rejection_reason: "Rejeté manuellement depuis la page de vérification" }),
      });
    } catch (_) { /* silencieux */ }
    setSubmitting(false);
    if (onBack) onBack();
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputWrap = (id) => ({
    position  : "relative", borderRadius: 12,
    border    : `1px solid ${focusedField === id ? "rgba(37,99,235,0.55)" : "rgba(255,255,255,0.08)"}`,
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

  // ── RENDU ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", padding: "80px 28px 60px", position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 660 }}>

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div className="fe1" style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            OCR · Facture fournisseur
          </p>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: "#e8f0ff", marginBottom: 6, letterSpacing: "-0.3px" }}>
            Vérifier la <span style={{ color: "#3b82f6" }}>facture</span>
          </h1>
          <p style={{ color: "#5a6e99", fontSize: 14, fontWeight: 300 }}>
            Vérifiez et corrigez les champs extraits par OCR avant de confirmer.
          </p>
        </div>

        {/* ── Bandeau de confiance OCR ──────────────────────────────────────── */}
        <div className="fe2" style={{ marginBottom: 20, display: "flex", gap: 12 }}>
          {/* Score de confiance */}
          <div style={{ flex: 1, padding: "14px 18px", borderRadius: 12, background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.22)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(37,99,235,0.14)", border: "1px solid rgba(37,99,235,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Confiance OCR</p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: extractionScore >= 75 ? "#10b981" : extractionScore >= 50 ? "#f59e0b" : "#f87171" }}>
                {extractionScore.toFixed(0)}%
              </p>
            </div>
          </div>
          {/* Statut de validation */}
          <div style={{ flex: 1, padding: "14px 18px", borderRadius: 12, background: needsReview ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${needsReview ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: needsReview ? "rgba(245,158,11,0.14)" : "rgba(16,185,129,0.14)", border: `1px solid ${needsReview ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {needsReview
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
              }
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Validation</p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 600, color: needsReview ? "#f59e0b" : "#10b981" }}>
                {needsReview ? "Revue requise" : "Auto-validation"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Alerte si note de frais détectée ─────────────────────────────── */}
        {initialDetection.type === "receipt" && (
          <AlertBanner type="error" message="Document suspect — l'analyse OCR suggère que ce fichier pourrait être une note de frais, pas une facture fournisseur. Vérifiez attentivement." />
        )}

        {/* ── Info validation automatique ───────────────────────────────────── */}
        {!needsReview && (
          <AlertBanner type="success" message="Ce document sera validé automatiquement après confirmation — le montant est en dessous du seuil de validation manuelle." />
        )}

        {/* ── Info validation manuelle requise ─────────────────────────────── */}
        {needsReview && (
          <div className="fe2" style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.25)", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p style={{ fontSize: 13, color: "#93c5fd", fontWeight: 400, lineHeight: 1.6 }}>
              <strong>Validation manuelle requise.</strong> Vérifiez chaque champ avant de confirmer. Seules les <strong>factures fournisseurs</strong> sont acceptées ici.
            </p>
          </div>
        )}

        {/* ── Messages erreur/succès soumission ────────────────────────────── */}
        {submitError && <AlertBanner type="error" message={submitError} onClose={() => setSubmitError("")} />}
        {successMsg  && <AlertBanner type="success" message={successMsg} />}

        {/* ── Ré-upload depuis cette page ───────────────────────────────────── */}
        <div className="fe2" style={{ marginBottom: 24 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/jpg,image/png"
            style={{ display: "none" }}
            onChange={handleNewFileUpload}
          />
          <div
            onClick={() => { setUploadError(""); fileInputRef.current?.click(); }}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 12, cursor: "pointer", transition: "all 0.25s", background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.25)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(37,99,235,0.12)"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(37,99,235,0.06)"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.25)"; }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {uploading
                ? <svg width="16" height="16" viewBox="0 0 20 20" style={{ animation: "spin-ring 0.8s linear infinite" }}><circle cx="10" cy="10" r="8" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="2.5"/><path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              }
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "#e8f0ff", marginBottom: 2 }}>
                {uploading ? "Analyse OCR en cours…" : "Uploader une autre facture fournisseur"}
              </p>
              <p style={{ fontSize: 11, color: "#5a6e99", fontWeight: 300 }}>
                PDF, JPG, PNG · Max 20 Mo · Remplace les données ci-dessous
              </p>
            </div>
            {!uploading && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3a4d72" strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>}
          </div>
        </div>

        {/* Erreurs d'upload */}
        {uploadError  && <AlertBanner type="error"   message={uploadError}   onClose={() => setUploadError("")} />}
        {uploadWarning && !uploadError && <AlertBanner type="warning" message={uploadWarning} onClose={() => setUploadWarning("")} />}

        {/* ── Formulaire principal ─────────────────────────────────────────── */}
        <div className="fe3 surface-card" style={{ padding: "32px 32px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,rgba(37,99,235,0.22),rgba(59,130,246,0.14))", border: "1px solid rgba(37,99,235,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "#e8f0ff", marginBottom: 1 }}>Champs extraits par OCR</p>
              <p style={{ fontSize: 11, color: "#3a4d72" }}>Cliquez sur un champ pour le corriger</p>
            </div>
            {documentId && (
              <span style={{ marginLeft: "auto", fontSize: 10, padding: "3px 10px", borderRadius: 20, background: "rgba(37,99,235,0.1)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.22)", fontWeight: 500 }}>
                Doc #{documentId}
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 20px" }}>

            {/* Numéro de facture */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: focusedField === "invoiceNumber" ? "#93c5fd" : "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.25s" }}>Numéro de facture</label>
              <div style={inputWrap("invoiceNumber")}>
                <div style={iconWrap(focusedField === "invoiceNumber")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <input type="text" value={form.invoiceNumber} placeholder="ex. INV-2026-00142" onChange={e => handleChange("invoiceNumber", e.target.value)} onFocus={() => setFocusedField("invoiceNumber")} onBlur={() => setFocusedField(null)} style={inputStyle} />
              </div>
            </div>

            {/* Date de facture */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: focusedField === "invoiceDate" ? "#93c5fd" : "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.25s" }}>Date de facture</label>
              <div style={inputWrap("invoiceDate")}>
                <div style={iconWrap(focusedField === "invoiceDate")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <input type="date" value={form.invoiceDate} onChange={e => handleChange("invoiceDate", e.target.value)} onFocus={() => setFocusedField("invoiceDate")} onBlur={() => setFocusedField(null)} style={inputStyle} />
              </div>
            </div>

            {/* Nom du fournisseur — pleine largeur */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: focusedField === "supplierName" ? "#93c5fd" : "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.25s" }}>Nom du fournisseur</label>
              <div style={inputWrap("supplierName")}>
                <div style={iconWrap(focusedField === "supplierName")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
                </div>
                <input type="text" value={form.supplierName} placeholder="ex. Auto Parts TN" onChange={e => handleChange("supplierName", e.target.value)} onFocus={() => setFocusedField("supplierName")} onBlur={() => setFocusedField(null)} style={inputStyle} />
              </div>
            </div>

            {/* Montant total */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: focusedField === "totalAmount" ? "#93c5fd" : "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.25s" }}>Montant total (TTC)</label>
              <div style={inputWrap("totalAmount")}>
                <div style={iconWrap(focusedField === "totalAmount")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <input type="text" value={form.totalAmount} placeholder="ex. 1 240.00" onChange={e => handleChange("totalAmount", e.target.value)} onFocus={() => setFocusedField("totalAmount")} onBlur={() => setFocusedField(null)} style={inputStyle} />
              </div>
            </div>

            {/* Devise */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Devise</label>
              <div style={{ ...inputWrap("currency"), padding: "2px 0" }}>
                <div style={iconWrap(focusedField === "currency")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <select value={form.currency} onChange={e => handleChange("currency", e.target.value)} onFocus={() => setFocusedField("currency")} onBlur={() => setFocusedField(null)} style={{ ...inputStyle, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
                  {CURRENCIES.map(c => <option key={c} value={c} style={{ background: "#0d1627" }}>{c}</option>)}
                </select>
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#3a4d72" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6,9 12,15 18,9"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Conseils de vérification ─────────────────────────────────────── */}
        <div className="fe4 surface-card" style={{ padding: "20px 24px", marginBottom: 28, borderLeft: "3px solid rgba(37,99,235,0.5)" }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "#e8f0ff", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>Conseils de vérification</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "🔢", text: "Vérifiez le numéro de facture — l'OCR peut confondre 0/O, 1/l." },
              { icon: "📅", text: "Assurez-vous que la date correspond bien à la facture papier." },
              { icon: "💰", text: "Contrôlez le montant et la devise — les séparateurs décimaux peuvent varier." },
              { icon: "🏢", text: "Le nom du fournisseur doit correspondre à votre base de données." },
              { icon: "⛔", text: "Si ce document est une note de frais, utilisez le flux dédié sur la page d'upload." },
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

          {/* Rejeter */}
          <button
            className="btn-ghost"
            onClick={handleReject}
            disabled={submitting || uploading}
            style={{ padding: "12px 22px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, color: "#f87171", borderColor: "rgba(248,113,113,0.25)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Rejeter
          </button>

          {/* Retour */}
          <button
            className="btn-ghost"
            onClick={onBack}
            disabled={submitting || uploading}
            style={{ padding: "12px 28px", fontSize: 14, display: "flex", alignItems: "center", gap: 8, fontFamily: "'Syne', sans-serif", fontWeight: 600 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
            Retour
          </button>

          {/* Confirmer */}
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={submitting || uploading || !!uploadError}
            style={{ padding: "12px 32px", fontSize: 14, display: "flex", alignItems: "center", gap: 8, opacity: (submitting || uploading || !!uploadError) ? 0.55 : 1, transition: "all 0.25s" }}
          >
            {submitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 20 20" style={{ animation: "spin-ring 0.8s linear infinite" }}><circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5"/><path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
                Enregistrement…
              </>
            ) : (
              <>
                Confirmer
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}