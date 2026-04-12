// ─── src/pages/UploadPage.jsx ─────────────────────────────────────────────────
// CONNEXION BACKEND COMPLÈTE :
//   - POST /invoices/upload  → facture fournisseur (role Comptable uniquement)
//   - POST /receipts/upload  → note de frais (tous les rôles)
//   - Header JWT Authorization + X-Username envoyés automatiquement
//   - Gestion des erreurs backend, loading spinner, toasts de succès/erreur
//   - Données OCR transmises aux pages de vérification respectives
//   - Vérification budget avant upload ← AJOUTÉ
//   - Archivage automatique dans localStorage après upload réussi ← AJOUTÉ

import { useState, useRef, useCallback } from "react";
import { Spinner, FileIcon } from "../components/Icons";
import { useBudget } from "../hooks/useBudget";           // ← AJOUTÉ
import BudgetWidget  from "../components/BudgetWidget";   // ← AJOUTÉ

// ── Constantes ────────────────────────────────────────────────────────────────
const BASE_URL = "http://127.0.0.1:8000";

const ROLES = {
  ADMIN_SYSTEME : "Administrateur Système",
  ADMIN_METIER  : "Administrateur",
  Comptable     : "Comptable",
  EMPLOYE       : "Utilisateur",
};

const UPLOAD_TYPES = {
  EXPENSE          : "expense",
  SUPPLIER_INVOICE : "supplier_invoice",
};

// ── Toast component ───────────────────────────────────────────────────────────
const Toast = ({ type, message, onClose }) => {
  const isSuccess = type === "success";
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 9999,
      padding: "14px 20px", borderRadius: 14, fontSize: 13, fontWeight: 500,
      display: "flex", alignItems: "center", gap: 10, minWidth: 280,
      animation: "slide-in-right 0.35s cubic-bezier(0.22,1,0.36,1)",
      background: isSuccess ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)",
      border: `1px solid ${isSuccess ? "rgba(16,185,129,0.4)" : "rgba(248,113,113,0.4)"}`,
      color: isSuccess ? "#10b981" : "#f87171",
      boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
    }}>
      {isSuccess
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 2, opacity: 0.7 }}>✕</button>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ← AJOUTÉ : prop addToArchive reçue depuis VerniColorApp
// ═════════════════════════════════════════════════════════════════════════════
const UploadPage = ({ onUploaded, onOcrDone, onExpenseOcrDone, addToArchive }) => {

  const role     = localStorage.getItem("role") || "";
  const username = localStorage.getItem("username") || "";

  const [dragging,   setDragging]   = useState(false);
  const [files,      setFiles]      = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [uploaded,   setUploaded]   = useState([]);
  const [uploadType, setUploadType] = useState(UPLOAD_TYPES.EXPENSE);
  const [error,      setError]      = useState("");
  const [toast,      setToast]      = useState(null); // { type, message }

  // ← AJOUTÉ : hook budget
  const { budgetStatus, isBudgetBlocked, checkBudget, refreshBudget } = useBudget();

  const inputExpenseRef = useRef(null);
  const inputInvoiceRef = useRef(null);
  const cameraRef       = useRef(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      f => f.type.includes("pdf") || f.type.includes("image")
    );
    if (dropped.length) setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handlePick          = e => setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  const handleCameraCapture = e => setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  const removeFile          = idx => setFiles(prev => prev.filter((_, i) => i !== idx));

  const openExpensePicker = () => {
    setUploadType(UPLOAD_TYPES.EXPENSE);
    setError("");
    inputExpenseRef.current?.click();
  };

  const openInvoicePicker = () => {
    if (role !== ROLES.Comptable) {
      setError("Accès refusé : seul le rôle Comptabilité peut uploader des factures fournisseur.");
      return;
    }
    setUploadType(UPLOAD_TYPES.SUPPLIER_INVOICE);
    setError("");
    inputInvoiceRef.current?.click();
  };

  // ── Upload principal ────────────────────────────────────────────────────────
  const handleUpload = async (file, type) => {
    setUploading(true);
    setError("");

    // ← AJOUTÉ : Vérification budget globale AVANT l'envoi au backend
    if (type === UPLOAD_TYPES.EXPENSE || type === UPLOAD_TYPES.SUPPLIER_INVOICE) {
      if (isBudgetBlocked) {
        setError("Upload bloqué : votre plafond mensuel est atteint. Contactez votre administrateur.");
        setUploading(false);
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      // ── Choisir le bon endpoint ────────────────────────────────────────────
      let endpoint, headers;

      if (type === UPLOAD_TYPES.EXPENSE) {
        // Note de frais → /receipts/upload
        endpoint = `${BASE_URL}/receipts/upload`;
        headers  = { "X-Username": username };
      } else {
        // Facture fournisseur → /invoices/upload (avec file_type en FormData)
        endpoint = `${BASE_URL}/invoices/upload`;
        headers  = { "X-Username": username };
        formData.append("file_type", "supplier_invoice");
      }

      const res = await fetch(endpoint, {
        method  : "POST",
        headers,         // PAS de Content-Type — laissé au navigateur pour FormData
        body    : formData,
      });

      // ── Gestion des erreurs HTTP ───────────────────────────────────────────
      if (res.status === 403) {
        throw new Error("Accès refusé — votre rôle ne permet pas cette action.");
      }
      if (res.status === 400) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Fichier invalide ou type non accepté.");
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();

      // ── Doublon détecté ────────────────────────────────────────────────────
      if (data.status === "duplicate") {
        showToast("error", "Ce fichier a déjà été uploadé (doublon détecté).");
        setFiles([]);
        setUploading(false);
        return;
      }

      // ── Erreur OCR ─────────────────────────────────────────────────────────
      if (data.status === "error") {
        throw new Error("L'OCR a échoué — vérifiez la qualité du document.");
      }

      // ── Succès : historique ────────────────────────────────────────────────
      const newUploaded = [{
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        date: "Just now",
        type,
      }];
      if (onUploaded) onUploaded(newUploaded);
      setUploaded(prev => [...prev, ...newUploaded]);
      setFiles([]);

      showToast("success", `Document uploadé et analysé avec succès !`);

      // ← AJOUTÉ : Archivage automatique du fichier brut dans localStorage
      // addToArchive est optionnel (présent seulement si passé depuis VerniColorApp)
      if (typeof addToArchive === "function") {
        try {
          await addToArchive(file, type);
        } catch {
          // L'archivage est silencieux — une erreur ici ne bloque pas l'upload
          console.warn("Archive: impossible d'archiver le fichier localement.");
        }
      }

      // ← AJOUTÉ : Rafraîchir le budget après upload réussi
      refreshBudget();

      // ── Redirection selon le type ──────────────────────────────────────────
      if (type === UPLOAD_TYPES.EXPENSE) {
        // Note de frais → ExpenseVerificationPage
        // data = réponse brute de /receipts/upload
        if (onExpenseOcrDone) onExpenseOcrDone(data);

      } else {
        // Facture fournisseur → InvoiceVerification
        // Normalise les champs depuis la réponse de /invoices/upload
        const firstInvoice = data.extracted_invoices?.[0]?.fields || {};

        const ocrResult = {
          // IDs pour les appels PATCH /invoices/{id}/validate
          document_id   : data.document_id,
          invoice_id    : data.invoice_ids?.[0],

          // Champs extraits par OCR
          invoiceNumber : firstInvoice.invoice_number ?? "",
          invoiceDate   : firstInvoice.invoice_date   ?? "",
          supplierName  : firstInvoice.supplier_name  ?? "",
          totalAmount   : firstInvoice.total_ttc ?? firstInvoice.total_amount ?? "",
          total_ht      : firstInvoice.total_ht       ?? "",
          total_vat     : firstInvoice.total_vat      ?? "",
          currency      : firstInvoice.currency        ?? "TND",
          tax_id        : firstInvoice.tax_id          ?? "",

          // Méta-données pour la vérification
          raw_text             : data.raw_text                ?? "",
          extraction_confidence: data.extracted_invoices?.[0]?.confidence ?? 0,
          needs_review         : data.extracted_invoices?.[0]?.needs_review ?? true,
        };
        if (onOcrDone) onOcrDone(ocrResult);
      }

    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Une erreur est survenue lors de l'upload.");
      showToast("error", err.message || "Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAll = () => {
    if (!files.length || uploading) return;
    handleUpload(files[0], uploadType);
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const uploadTypeLabel = uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE
    ? "Facture fournisseur"
    : "Note de frais";

  const uploadTypeBadgeStyle = uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE
    ? { background: "rgba(37,99,235,0.12)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.3)" }
    : { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" };

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", padding: "80px 28px 40px", position: "relative", zIndex: 1 }}>

      {/* ── Toast notification ──────────────────────────────────────────────── */}
      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}

      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div className="fe1" style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Invoice Management
          </p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 30, fontWeight: 800, color: "#e8f0ff", marginBottom: 6, letterSpacing: "-0.3px" }}>
            Upload <span style={{ color: "#3b82f6" }}>Documents</span>
          </h1>
          <p style={{ color: "#5a6e99", fontSize: 14, fontWeight: 300 }}>
            Uploadez vos documents selon votre profil.
          </p>
        </div>

        {/* ── Statut budget ─────────────────────────────────────────────────── */}
        {/* ← AJOUTÉ : widget budget compact avant la zone drag & drop */}
        <div className="fe2" style={{ marginBottom: 20 }}>
          <BudgetWidget compact />
        </div>

        {/* ── Sélecteur de type d'upload ───────────────────────────────────── */}
        <div className="fe2" style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>

          {/* Note de frais — TOUS LES RÔLES */}
          <div
            onClick={openExpensePicker}
            style={{
              flex: "1 1 220px", padding: "20px 22px", borderRadius: 16, cursor: "pointer",
              transition: "all 0.25s",
              background: uploadType === UPLOAD_TYPES.EXPENSE
                ? "linear-gradient(145deg,rgba(16,185,129,0.12),rgba(16,185,129,0.06))"
                : "linear-gradient(145deg,#0d1627,#0a1120)",
              border: uploadType === UPLOAD_TYPES.EXPENSE
                ? "1px solid rgba(16,185,129,0.45)"
                : "1px solid rgba(255,255,255,0.07)",
              boxShadow: uploadType === UPLOAD_TYPES.EXPENSE ? "0 0 24px rgba(16,185,129,0.12)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#e8f0ff", marginBottom: 2 }}>Note de frais</p>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.22)", fontWeight: 500 }}>
                  Tous les rôles
                </span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#5a6e99", fontWeight: 300, lineHeight: 1.5 }}>
              Remboursement de dépenses personnelles (transport, repas, hébergement…)
            </p>
          </div>

          {/* Facture fournisseur — COMPTABILITÉ UNIQUEMENT */}
          <div
            onClick={openInvoicePicker}
            title={role !== ROLES.Comptable ? "Accès réservé au rôle Comptabilité" : ""}
            style={{
              flex: "1 1 220px", padding: "20px 22px", borderRadius: 16,
              transition: "all 0.25s", position: "relative",
              cursor: role === ROLES.Comptable ? "pointer" : "not-allowed",
              opacity: role === ROLES.Comptable ? 1 : 0.45,
              background: uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE
                ? "linear-gradient(145deg,rgba(37,99,235,0.12),rgba(37,99,235,0.06))"
                : "linear-gradient(145deg,#0d1627,#0a1120)",
              border: uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE
                ? "1px solid rgba(37,99,235,0.55)"
                : "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#e8f0ff", marginBottom: 2 }}>Facture fournisseur</p>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(37,99,235,0.1)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.22)", fontWeight: 500 }}>
                  Comptabilité uniquement
                </span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#5a6e99", fontWeight: 300, lineHeight: 1.5 }}>
              Factures fournisseurs à intégrer dans la comptabilité (TVA, HT, TTC…)
            </p>
            {role !== ROLES.Comptable && (
              <div style={{ position: "absolute", top: 12, right: 12 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a6e99" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* ── Erreur ──────────────────────────────────────────────────────────── */}
        {error && (
          <div className="fe2" style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", fontSize: 13, display: "flex", alignItems: "center", gap: 10, animation: "fade-in 0.3s ease" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
            <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#f87171" }}>✕</button>
          </div>
        )}

        {/* ── Inputs cachés ────────────────────────────────────────────────── */}
        <input ref={inputExpenseRef} type="file" multiple accept="application/pdf,image/*" onChange={handlePick} style={{ display: "none" }} />
        <input ref={inputInvoiceRef} type="file" multiple accept="application/pdf,image/*" onChange={role === ROLES.Comptable ? handlePick : undefined} style={{ display: "none" }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} style={{ display: "none" }} />

        {/* ── Zone Drag & Drop ──────────────────────────────────────────────── */}
        <div
          className="fe3 surface-card"
          style={{
            padding: "50px 40px", textAlign: "center", marginBottom: 24,
            cursor: "pointer", transition: "all 0.35s",
            borderColor: dragging ? "rgba(37,99,235,0.65)" : undefined,
            background : dragging ? "rgba(37,99,235,0.05)" : undefined,
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE && role !== ROLES.Comptable) {
              setError("Accès refusé : seul le rôle Comptabilité peut uploader des factures fournisseur.");
              return;
            }
            uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE
              ? inputInvoiceRef.current?.click()
              : inputExpenseRef.current?.click();
          }}
        >
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,rgba(37,99,235,0.17),rgba(59,130,246,0.12))", border: "1px solid rgba(37,99,235,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "#e8f0ff", marginBottom: 6 }}>
            {dragging ? "Déposez ici" : "Glissez-déposez votre fichier"}
          </p>
          <span style={{ display: "inline-block", fontSize: 11, padding: "3px 12px", borderRadius: 20, marginBottom: 16, fontWeight: 500, ...uploadTypeBadgeStyle }}>
            {uploadTypeLabel}
          </span>
          <p style={{ color: "#5a6e99", fontSize: 13, marginBottom: 20 }}>
            PDF, JPG, PNG acceptés · Max 20 Mo
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
            <div className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, cursor: "pointer", background: "linear-gradient(135deg,#059669,#10b981)" }} onClick={openExpensePicker}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              Note de frais
            </div>

            {role === ROLES.Comptable && (
              <div className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, cursor: "pointer" }} onClick={openInvoicePicker}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
                Facture fournisseur
              </div>
            )}

            <div
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, fontSize: 13, cursor: "pointer", background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)", color: "#93c5fd", fontFamily: "'Syne',sans-serif", fontWeight: 600 }}
              onClick={() => cameraRef.current?.click()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Prendre une photo
            </div>
          </div>
        </div>

        {/* ── Conseils OCR ─────────────────────────────────────────────────── */}
        <div className="fe4 surface-card" style={{ padding: "20px 24px", marginBottom: 24, borderLeft: "3px solid rgba(37,99,235,0.55)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: "#e8f0ff", marginBottom: 1 }}>Conseils pour une extraction OCR précise</p>
              <p style={{ fontSize: 11, color: "#3a4d72", fontWeight: 300 }}>Meilleure qualité = extraction plus rapide et fiable</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            {[
              { icon: "☀️", tip: "Bonne luminosité",       desc: "Photographiez dans un endroit bien éclairé." },
              { icon: "🔍", tip: "Mise au point nette",     desc: "Tenez votre appareil stable. Le texte doit être lisible." },
              { icon: "📐", tip: "Alignement droit",        desc: "Posez le reçu à plat. Évitez les angles." },
              { icon: "📄", tip: "Couverture complète",     desc: "Capturez tout le document sans couper les bords." },
              { icon: "🎨", tip: "Fond contrasté",          desc: "Posez le document sur une surface sombre." },
              { icon: "🚫", tip: "Pas d'ombres ni reflets", desc: "Éliminez les ombres et évitez les reflets." },
            ].map(({ icon, tip, desc }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#93c5fd", marginBottom: 2, fontFamily: "'Syne',sans-serif" }}>{tip}</p>
                  <p style={{ fontSize: 11, color: "#5a6e99", fontWeight: 300, lineHeight: 1.55 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Fichiers en attente d'upload ──────────────────────────────────── */}
        {files.length > 0 && (
          <div className="fe3 surface-card" style={{ padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#e8f0ff" }}>
                  {files.length} fichier{files.length > 1 ? "s" : ""} prêt{files.length > 1 ? "s" : ""}
                </p>
                <span style={{ fontSize: 11, ...uploadTypeBadgeStyle, padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>
                  {uploadTypeLabel}
                </span>
              </div>
              <button
                className="btn-primary"
                onClick={handleUploadAll}
                disabled={uploading}
                style={{ padding: "9px 22px", fontSize: 13, display: "flex", alignItems: "center", gap: 8, opacity: uploading ? 0.7 : 1 }}
              >
                {uploading
                  ? <><Spinner /> Analyse OCR en cours…</>
                  : <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17,8 12,3 7,8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Uploader et analyser
                    </>
                }
              </button>
            </div>

            {/* Loading OCR banner */}
            {uploading && (
              <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.22)", color: "#60a5fa", fontSize: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <Spinner />
                Extraction OCR en cours — cela peut prendre quelques secondes…
              </div>
            )}

            {files.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", marginBottom: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <FileIcon />
                  <div>
                    <p style={{ fontSize: 13, color: "#e8f0ff", fontWeight: 400 }}>{f.name}</p>
                    <p style={{ fontSize: 11, color: "#5a6e99" }}>{(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  disabled={uploading}
                  style={{ background: "none", border: "none", cursor: uploading ? "default" : "pointer", color: "#5a6e99", padding: 4, opacity: uploading ? 0.4 : 1 }}
                  onMouseEnter={e => { if (!uploading) e.target.style.color = "#f87171"; }}
                  onMouseLeave={e => e.target.style.color = "#5a6e99"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Historique uploads ────────────────────────────────────────────── */}
        {uploaded.length > 0 && (
          <div className="fe4 surface-card" style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#e8f0ff", marginBottom: 16 }}>Fichiers uploadés</p>
            {uploaded.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(16,185,129,0.04)", marginBottom: 8, border: "1px solid rgba(16,185,129,0.12)", animation: "fade-in 0.4s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <FileIcon color="#10b981" />
                  <div>
                    <p style={{ fontSize: 13, color: "#e8f0ff" }}>{f.name}</p>
                    <p style={{ fontSize: 11, color: "#5a6e99" }}>
                      {f.size} · {f.date} ·{" "}
                      <span style={{ color: f.type === UPLOAD_TYPES.SUPPLIER_INVOICE ? "#60a5fa" : "#10b981" }}>
                        {f.type === UPLOAD_TYPES.SUPPLIER_INVOICE ? "Facture fournisseur" : "Note de frais"}
                      </span>
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)", fontWeight: 500 }}>
                  Uploadé ✓
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default UploadPage;