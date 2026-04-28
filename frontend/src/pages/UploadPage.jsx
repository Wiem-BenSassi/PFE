// ─── src/pages/UploadPage.jsx ─────────────────────────────────────────────────
// RESPONSIVE COMPLET — mobile-first, boutons touch-friendly, layout adaptatif
//
// MODIFICATIONS :
//   - Suppression du blocage isBudgetBlocked (l'upload n'est plus jamais bloqué)
//   - Ajout d'un bandeau d'avertissement orange/rouge si pct ≥ 95%
//   - Le message d'erreur "Upload bloqué" est retiré
//   - isOverThreshold utilisé depuis useBudget pour afficher le warning

import { useState, useRef, useCallback, useEffect } from "react";
import { Spinner, FileIcon } from "../components/Icons";
import { useBudget } from "../hooks/useBudget";
import BudgetWidget  from "../components/BudgetWidget";
import BudgetAlertBanner  from "../components/BudgetAlertBanner"; 

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

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ type, message, onClose }) => {
  const ok = type === "success";
  return (
    <div className="toast-wrap">
      <div style={{
        padding:"14px 18px", borderRadius:14, fontSize:13, fontWeight:500,
        display:"flex", alignItems:"center", gap:10,
        animation:"slide-in-right 0.3s cubic-bezier(0.22,1,0.36,1)",
        background: ok ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)",
        border: `1px solid ${ok ? "rgba(16,185,129,0.4)" : "rgba(248,113,113,0.4)"}`,
        color: ok ? "#10b981" : "#f87171",
        boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
      }}>
        {ok
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        }
        <span style={{ flex:1 }}>{message}</span>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", padding:4, opacity:0.7, minWidth:28, minHeight:28, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
      </div>
    </div>
  );
};

// ── Bandeau d'avertissement budget (≥ 95%) ────────────────────────────────────
// NOUVEAU : affiché quand le seuil est proche ou dépassé, mais sans blocage
const BudgetWarningBanner = ({ pct, isExceeded }) => (
  <div style={{
    marginBottom:16, padding:"12px 16px", borderRadius:12,
    background: isExceeded
      ? "rgba(239,68,68,0.1)"
      : "rgba(249,115,22,0.09)",
    border: `1px solid ${isExceeded ? "rgba(239,68,68,0.35)" : "rgba(249,115,22,0.3)"}`,
    display:"flex", alignItems:"flex-start", gap:12,
    animation:"fade-in 0.3s ease",
  }}>
    <span style={{ fontSize:18, flexShrink:0 }}>
      {isExceeded ? "🚨" : "⚠️"}
    </span>
    <div>
      <p style={{ fontSize:13, fontWeight:600, marginBottom:3,
                  color: isExceeded ? "#fca5a5" : "#fed7aa" }}>
        {isExceeded
          ? `Seuil dépassé (${pct.toFixed(1)}%) — Administrateur notifié par email`
          : `Attention : ${pct.toFixed(1)}% du plafond de notes de frais atteint`
        }
      </p>
      <p style={{ fontSize:12, color:"#9ca3af", fontWeight:300, lineHeight:1.5 }}>
        {isExceeded
          ? "Votre plafond mensuel est dépassé. L'upload reste autorisé."
          : "Vous approchez de votre limite mensuelle. Un email d'alerte sera envoyé à l'admin."
        }
        {" "}Contactez votre responsable si nécessaire.
      </p>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
const UploadPage = ({ onUploaded, onOcrDone, onExpenseOcrDone, addToArchive }) => {
  const role     = localStorage.getItem("role") || "";
  const username = localStorage.getItem("username") || "";

  const [isMobile,   setIsMobile]   = useState(() => window.innerWidth < 640);
  const [dragging,   setDragging]   = useState(false);
  const [files,      setFiles]      = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [uploaded,   setUploaded]   = useState([]);
  const [uploadType, setUploadType] = useState(UPLOAD_TYPES.EXPENSE);
  const [error,      setError]      = useState("");
  const [toast,      setToast]      = useState(null);

  // MODIFIÉ : récupération de isOverThreshold (remplace isBudgetBlocked)
  const { budgetStatus, isOverThreshold, checkBudget, refreshBudget } = useBudget();

  const inputExpenseRef = useRef(null);
  const inputInvoiceRef = useRef(null);
  const cameraRef       = useRef(null);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
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

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async (file, type) => {
    setUploading(true);
    setError("");

    // MODIFIÉ : plus de vérification isBudgetBlocked
    // L'upload est toujours autorisé — on affiche seulement un warning si ≥ 95%

    try {
      const formData = new FormData();
      formData.append("file", file);

      let endpoint, headers;
      if (type === UPLOAD_TYPES.EXPENSE) {
        endpoint = `${BASE_URL}/receipts/upload`;
        headers  = { "X-Username": username };
      } else {
        endpoint = `${BASE_URL}/invoices/upload`;
        headers  = { "X-Username": username };
        formData.append("file_type", "supplier_invoice");
      }

      const res = await fetch(endpoint, { method:"POST", headers, body:formData });

      if (res.status === 403) throw new Error("Accès refusé — votre rôle ne permet pas cette action.");
      if (res.status === 400) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Fichier invalide ou type non accepté.");
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();

      if (data.status === "duplicate") {
        showToast("error", "Ce fichier a déjà été uploadé (doublon détecté).");
        setFiles([]); setUploading(false); return;
      }
      if (data.status === "error") throw new Error("L'OCR a échoué — vérifiez la qualité du document.");

      const newUploaded = [{ name:file.name, size:(file.size/1024).toFixed(1)+" KB", date:"À l'instant", type }];
      if (onUploaded) onUploaded(newUploaded);
      setUploaded(prev => [...prev, ...newUploaded]);
      setFiles([]);
      showToast("success", "Document uploadé et analysé avec succès !");

      if (typeof addToArchive === "function") {
        try { await addToArchive(file, type); } catch { /* silencieux */ }
      }
      refreshBudget();

      if (type === UPLOAD_TYPES.EXPENSE) {
        if (onExpenseOcrDone) onExpenseOcrDone(data);
      } else {
        const firstInvoice = data.extracted_invoices?.[0]?.fields || {};
        const ocrResult = {
          document_id   : data.document_id,
          invoice_id    : data.invoice_ids?.[0],
          invoiceNumber : firstInvoice.invoice_number ?? "",
          invoiceDate   : firstInvoice.invoice_date   ?? "",
          supplierName  : firstInvoice.supplier_name  ?? "",
          totalAmount   : firstInvoice.total_ttc ?? firstInvoice.total_amount ?? "",
          total_ht      : firstInvoice.total_ht       ?? "",
          total_vat     : firstInvoice.total_vat      ?? "",
          currency      : firstInvoice.currency        ?? "TND",
          tax_id        : firstInvoice.tax_id          ?? "",
          raw_text             : data.raw_text                ?? "",
          extraction_confidence: data.extracted_invoices?.[0]?.confidence ?? 0,
          needs_review         : data.extracted_invoices?.[0]?.needs_review ?? true,
        };
        if (onOcrDone) onOcrDone(ocrResult);
      }
    } catch (err) {
      setError(err.message || "Une erreur est survenue lors de l'upload.");
      showToast("error", err.message || "Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAll = () => { if (!files.length || uploading) return; handleUpload(files[0], uploadType); };

  const isExpense  = uploadType === UPLOAD_TYPES.EXPENSE;
  const badgeStyle = isExpense
    ? { background:"rgba(16,185,129,0.12)", color:"#10b981", border:"1px solid rgba(16,185,129,0.28)" }
    : { background:"rgba(37,99,235,0.12)",  color:"#60a5fa", border:"1px solid rgba(37,99,235,0.28)"  };

  // Calcul pour l'affichage du warning
  const currentPct    = budgetStatus?.pct_utilise ?? 0;
  const isExceeded    = currentPct >= 100;
  // Afficher le warning seulement pour les notes de frais (pas les factures fournisseur)
  const showWarning   = isOverThreshold && uploadType === UPLOAD_TYPES.EXPENSE;

  return (
    <div style={{ minHeight:"100vh", padding:"var(--page-pt) var(--page-px) 48px", position:"relative", zIndex:1 }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div style={{ maxWidth:860, margin:"0 auto" }}>

        {/* ── En-tête ──────────────────────────────────────────────────────── */}
        <div className="fe1" style={{ marginBottom:24 }}>
          <p style={{ fontSize:11, color:"#5a6e99", letterSpacing:"0.08em",
                      textTransform:"uppercase", marginBottom:6 }}>
            Gestion des documents
          </p>
          <h1 className="page-title" style={{ marginBottom:6 }}>
            Téléverser <span style={{color:"#3b82f6"}}>Des Documents</span>
          </h1>
          <p style={{ color:"#5a6e99", fontSize:14, fontWeight:300 }}>
            Choisissez le type de document à soumettre.
          </p>
        </div>

        {/* ── Budget widget ─────────────────────────────────────────────────── */}
        <div className="fe2" style={{ marginBottom:18 }}>
          <BudgetWidget compact />
        </div>
            {/* ── Alerte budget ← AJOUTER ────────────────────────────── */}
          <BudgetAlertBanner
          pct={budgetStatus?.pct_utilise ?? 0}
          dismissible
          />
        {/* ── NOUVEAU : Bandeau warning si seuil ≥ 95% (notes de frais) ────── */}
        {showWarning && (
          <div className="fe2">
            <BudgetWarningBanner pct={currentPct} isExceeded={isExceeded} />
          </div>
        )}

        {/* ── Sélecteur de type ─────────────────────────────────────────────── */}
        <div className="fe2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--gap)", marginBottom:18 }}>

          {/* Note de frais */}
          <div
            className="upload-type-card"
            onClick={openExpensePicker}
            style={{
              background: isExpense
                ? "linear-gradient(145deg,rgba(16,185,129,0.12),rgba(16,185,129,0.06))"
                : "linear-gradient(145deg,#0d1627,#0a1120)",
              border: isExpense
                ? "1px solid rgba(16,185,129,0.5)"
                : "1px solid rgba(255,255,255,0.07)",
              boxShadow: isExpense ? "0 0 20px rgba(16,185,129,0.1)" : "none",
            }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:isMobile?4:8 }}>
              <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                            background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.25)",
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700,
                            color:"#e8f0ff", marginBottom:2, overflow:"hidden",
                            textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  Note de frais
                </p>
                {!isMobile && (
                  <span className="badge badge-green" style={{ fontSize:9 }}>Tous les rôles</span>
                )}
              </div>
            </div>
            {!isMobile && (
              <p style={{ fontSize:12, color:"#5a6e99", fontWeight:300, lineHeight:1.5 }}>
                Transport, repas, hébergement…
              </p>
            )}
          </div>

          {/* Facture fournisseur */}
          <div
            className="upload-type-card"
            onClick={openInvoicePicker}
            title={role !== ROLES.Comptable ? "Accès réservé Comptabilité" : ""}
            style={{
              opacity: role === ROLES.Comptable ? 1 : 0.45,
              cursor : role === ROLES.Comptable ? "pointer" : "not-allowed",
              background: !isExpense
                ? "linear-gradient(145deg,rgba(37,99,235,0.12),rgba(37,99,235,0.06))"
                : "linear-gradient(145deg,#0d1627,#0a1120)",
              border: !isExpense
                ? "1px solid rgba(37,99,235,0.55)"
                : "1px solid rgba(255,255,255,0.07)",
              boxShadow: !isExpense ? "0 0 20px rgba(37,99,235,0.1)" : "none",
              position:"relative",
            }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:isMobile?4:8 }}>
              <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                            background:"rgba(37,99,235,0.12)", border:"1px solid rgba(37,99,235,0.25)",
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700,
                            color:"#e8f0ff", marginBottom:2, overflow:"hidden",
                            textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {isMobile ? "Fournisseur" : "Facture fournisseur"}
                </p>
                {!isMobile && (
                  <span className="badge badge-blue" style={{ fontSize:9 }}>Comptabilité</span>
                )}
              </div>
            </div>
            {!isMobile && (
              <p style={{ fontSize:12, color:"#5a6e99", fontWeight:300, lineHeight:1.5 }}>
                Factures TVA, HT, TTC à intégrer…
              </p>
            )}
            {role !== ROLES.Comptable && (
              <div style={{ position:"absolute", top:10, right:10 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a6e99" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* ── Boutons d'action rapide ──────────────────────────────────────── */}
        <div className="fe2" style={{ marginBottom:18 }}>
          {/* Inputs cachés */}
          <input ref={inputExpenseRef} type="file" multiple accept="application/pdf,image/*" onChange={handlePick} style={{ display:"none" }} />
          <input ref={inputInvoiceRef} type="file" multiple accept="application/pdf,image/*" onChange={role===ROLES.Comptable ? handlePick : undefined} style={{ display:"none" }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} style={{ display:"none" }} />

          <div className="action-row">
            <button
              className="btn-primary"
              onClick={() => isExpense ? openExpensePicker() : openInvoicePicker()}
              style={{ fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Choisir un fichier
            </button>

            <button
              className="btn-ghost"
              onClick={() => cameraRef.current?.click()}
              style={{ fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Prendre en photo
            </button>
          </div>
        </div>

        {/* ── Erreur ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="fe2" style={{
            marginBottom:16, padding:"12px 16px", borderRadius:12,
            background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)",
            color:"#f87171", fontSize:13, display:"flex", alignItems:"flex-start", gap:10,
            animation:"fade-in 0.3s ease",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ flex:1 }}>{error}</span>
            <button onClick={() => setError("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#f87171", padding:4, minWidth:28, minHeight:28, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          </div>
        )}

        {/* ── Dropzone ─────────────────────────────────────────────────────── */}
        <div
          className={`fe3 dropzone ${dragging ? "dragging" : ""}`}
          style={{ marginBottom:18 }}
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
          <div style={{
            width:64, height:64, borderRadius:18, margin:"0 auto 14px",
            background:"linear-gradient(135deg,rgba(37,99,235,0.18),rgba(59,130,246,0.12))",
            border:"1px solid rgba(37,99,235,0.35)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>

          <p style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700,
                      color:"#e8f0ff", marginBottom:6 }}>
            {dragging ? "Déposez ici !" : isMobile ? "Appuyez pour sélectionner" : "Glissez-déposez votre fichier"}
          </p>

          <span className="badge" style={{ ...badgeStyle, marginBottom:12 }}>
            {isExpense ? "Note de frais" : "Facture fournisseur"}
          </span>

          <p style={{ color:"#3a4d72", fontSize:12, fontWeight:300 }}>
            PDF, JPEG, PNG · Max 20 MB
          </p>
        </div>

        {/* ── Fichiers sélectionnés ─────────────────────────────────────────── */}
        {files.length > 0 && (
          <div className="fe3 surface-card" style={{ padding:"var(--card-pad)", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                          marginBottom:14, flexWrap:"wrap", gap:10 }}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:"#e8f0ff" }}>
                  {files.length} fichier{files.length>1?"s":""} prêt{files.length>1?"s":""}
                </p>
                <span className="badge" style={{ ...badgeStyle, marginTop:4 }}>
                  {isExpense ? "Note de frais" : "Facture fournisseur"}
                </span>
              </div>
              <button
                className="btn-primary"
                onClick={handleUploadAll}
                disabled={uploading}
                style={{ fontSize:13, padding:"0 18px", display:"flex", alignItems:"center", gap:8 }}
              >
                {uploading
                  ? <><Spinner /> Analyse…</>
                  : <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17,8 12,3 7,8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Téléverser
                    </>
                }
              </button>
            </div>

            {uploading && (
              <div style={{ marginBottom:12, padding:"10px 14px", borderRadius:10,
                            background:"rgba(37,99,235,0.08)", border:"1px solid rgba(37,99,235,0.22)",
                            color:"#60a5fa", fontSize:12, display:"flex", alignItems:"center", gap:10 }}>
                <Spinner /> Extraction en cours…
              </div>
            )}

            {files.map((f, i) => (
              <div key={i} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"10px 12px", borderRadius:10,
                background:"rgba(255,255,255,0.03)", marginBottom:6,
                border:"1px solid rgba(255,255,255,0.05)", gap:8,
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0, flex:1 }}>
                  <FileIcon />
                  <div style={{ minWidth:0 }}>
                    <p className="truncate" style={{ fontSize:13, color:"#e8f0ff" }}>{f.name}</p>
                    <p style={{ fontSize:11, color:"#5a6e99" }}>{(f.size/1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  disabled={uploading}
                  style={{ background:"none", border:"none", cursor:uploading?"default":"pointer",
                           color:"#5a6e99", minWidth:36, minHeight:36, display:"flex",
                           alignItems:"center", justifyContent:"center", borderRadius:8,
                           opacity:uploading?0.4:1, flexShrink:0 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Conseils OCR ─────────────────────────────────────────────────── */}
        <div className="fe4 surface-card" style={{ padding:"var(--card-pad)", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:32, height:32, borderRadius:9, flexShrink:0,
                          background:"rgba(37,99,235,0.08)", border:"1px solid rgba(37,99,235,0.18)",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:"#e8f0ff" }}>
                Conseils pour une bonne extraction OCR
              </p>
              <p style={{ fontSize:11, color:"#3a4d72" }}>Meilleure qualité = résultats plus précis</p>
            </div>
          </div>

          <div className="tip-grid">
            {[
              { icon:"☀️", tip:"Bonne lumière",    desc:"Photographiez dans un endroit bien éclairé." },
              { icon:"🔍", tip:"Mise au point",     desc:"Le texte doit être net et lisible." },
              { icon:"📐", tip:"Aligné droit",      desc:"Posez le reçu à plat, évitez les angles." },
              { icon:"📄", tip:"Document complet",  desc:"Capturez tous les bords du document." },
              { icon:"🎨", tip:"Fond contrasté",    desc:"Utilisez un fond sombre sous le document." },
              { icon:"🚫", tip:"Sans ombres",       desc:"Éliminez ombres et reflets." },
            ].map(({ icon, tip, desc }, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10,
                                    padding:"10px 12px", borderRadius:10,
                                    background:"rgba(255,255,255,0.02)",
                                    border:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:16, lineHeight:1, flexShrink:0, marginTop:1 }}>{icon}</span>
                <div>
                  <p style={{ fontSize:12, fontWeight:600, color:"#93c5fd", marginBottom:2 }}>{tip}</p>
                  <p style={{ fontSize:11, color:"#5a6e99", fontWeight:300, lineHeight:1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Historique uploads ───────────────────────────────────────────── */}
        {uploaded.length > 0 && (
          <div className="fe5 surface-card">
            <div style={{ padding:"var(--card-pad) var(--card-pad) 0" }}>
              <p style={{ fontSize:13, fontWeight:600, color:"#e8f0ff", marginBottom:14 }}>
                Fichiers uploadés
              </p>
            </div>
            {uploaded.map((f, i) => (
              <div key={i} className="mobile-list-item"
                   style={{ padding:"12px var(--card-pad)", animation:"fade-in 0.4s ease" }}>
                <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
                              background:"rgba(16,185,129,0.09)", border:"1px solid rgba(16,185,129,0.2)",
                              display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <FileIcon color="#10b981" />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p className="truncate" style={{ fontSize:13, color:"#e8f0ff" }}>{f.name}</p>
                  <p style={{ fontSize:11, color:"#5a6e99", marginTop:2 }}>
                    {f.size} · {f.date} ·{" "}
                    <span style={{ color:f.type===UPLOAD_TYPES.SUPPLIER_INVOICE ? "#60a5fa" : "#10b981" }}>
                      {f.type===UPLOAD_TYPES.SUPPLIER_INVOICE ? "Fournisseur" : "Note de frais"}
                    </span>
                  </p>
                </div>
                <span className="badge badge-green" style={{ flexShrink:0 }}>✓</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default UploadPage;