// ─── src/pages/UploadPage.jsx ─────────────────────────────────────────────────
// Page d'upload des factures avec gestion des rôles (RBAC).
//
// RÈGLES MÉTIER :
//   - "note de frais"         → visible pour TOUS les rôles
//   - "facture fournisseur"   → visible UNIQUEMENT pour le rôle "Comptable"
//
// Le rôle est lu depuis localStorage (sauvegardé lors du login).

import { useState, useRef, useCallback } from "react";
import { Spinner, FileIcon } from "../components/Icons";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE RÔLES
// ─────────────────────────────────────────────────────────────────────────────
const ROLES = {
  ADMIN_SYSTEME : "Administrateur Système",
  ADMIN_METIER  : "Administrateur",
  Comptable     : "Comptable",
  EMPLOYE       : "Utilisateur",
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES D'UPLOAD
// ─────────────────────────────────────────────────────────────────────────────
const UPLOAD_TYPES = {
  EXPENSE          : "expense",           // note de frais — tous les rôles
  SUPPLIER_INVOICE : "supplier_invoice",  // facture fournisseur — comptabilité seulement
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const UploadPage = ({ onUploaded, onOcrDone }) => {

  // ── Lecture du rôle depuis localStorage (sauvegardé après le login) ────────
  const role = localStorage.getItem("role") || "";

  // ── States ──────────────────────────────────────────────────────────────────
  const [dragging,    setDragging]    = useState(false);
  const [files,       setFiles]       = useState([]);
  const [uploading,   setUploading]   = useState(false);
  const [uploaded,    setUploaded]    = useState([]);

  // Type d'upload sélectionné : "expense" ou "supplier_invoice"
  const [uploadType,  setUploadType]  = useState(UPLOAD_TYPES.EXPENSE);

  // Message d'erreur (ex: accès refusé)
  const [error,       setError]       = useState("");

  // Inputs fichiers cachés — un pour chaque type
  const inputExpenseRef  = useRef(null);   // note de frais
  const inputInvoiceRef  = useRef(null);   // facture fournisseur
  const cameraRef        = useRef(null);   // caméra mobile

  // ── Gestion des fichiers ─────────────────────────────────────────────────────

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      f => f.type.includes("pdf") || f.type.includes("image")
    );
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handlePick          = e => setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  const handleCameraCapture = e => setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  const removeFile          = idx => setFiles(prev => prev.filter((_, i) => i !== idx));

  // ── Sélection du type puis ouverture de l'input correspondant ───────────────

  const openExpensePicker = () => {
    // Note de frais → accessible à tous
    setUploadType(UPLOAD_TYPES.EXPENSE);
    setError("");
    inputExpenseRef.current?.click();
  };

  const openInvoicePicker = () => {
    // ✅ CORRECTION : utilise ROLES.Comptable (et non ROLES.COMPTABILITE qui est undefined)
    if (role !== ROLES.Comptable) {
      setError("Accès refusé : seul le rôle Comptabilité peut uploader des factures fournisseur.");
      return;
    }
    setUploadType(UPLOAD_TYPES.SUPPLIER_INVOICE);
    setError("");
    inputInvoiceRef.current?.click();
  };

  // ── Upload principal avec type de fichier ────────────────────────────────────
  const handleUpload = async (file, type) => {
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file",      file);
      formData.append("file_type", type);

      const res  = await fetch("http://127.0.0.1:8000/invoices/upload", {
        method  : "POST",
        headers : {},
        body    : formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Erreur serveur (${res.status})`);
      }

      const data = await res.json();

      const ocrResult = {
        invoiceNumber: data.invoice_number ?? data.invoiceNumber ?? "",
        invoiceDate:   data.invoice_date   ?? data.invoiceDate   ?? "",
        supplierName:  data.supplier_name  ?? data.supplierName  ?? "",
        totalAmount:   data.total_amount   ?? data.totalAmount   ?? "",
      };

      const newUploaded = [{
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        date: "Just now",
        type,
      }];

      if (onUploaded) onUploaded(newUploaded);
      setUploaded(prev => [...prev, ...newUploaded]);
      setFiles([]);

      if (onOcrDone) onOcrDone(ocrResult);

    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Une erreur est survenue lors de l'upload.");
    } finally {
      setUploading(false);
    }
  };

  // Appelé depuis le bouton "Upload all" — utilise le type sélectionné
  const handleUploadAll = () => {
    if (!files.length) return;
    handleUpload(files[0], uploadType);
  };

  // ── Libellés selon le type sélectionné ──────────────────────────────────────
  const uploadTypeLabel = uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE
    ? "Facture fournisseur"
    : "Note de frais";

  const uploadTypeBadgeStyle = uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE
    ? { background: "rgba(37,99,235,0.12)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.3)" }
    : { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" };

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", padding: "80px 28px 40px", position: "relative", zIndex: 1 }}>
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

        {/* ── Sélecteur de type d'upload ───────────────────────────────────── */}
        <div className="fe2" style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>

          {/* ── Bouton Note de frais — TOUS LES RÔLES ── */}
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
              boxShadow: uploadType === UPLOAD_TYPES.EXPENSE
                ? "0 0 24px rgba(16,185,129,0.12)"
                : "none",
            }}
            onMouseEnter={e => { if (uploadType !== UPLOAD_TYPES.EXPENSE) e.currentTarget.style.borderColor = "rgba(16,185,129,0.3)"; }}
            onMouseLeave={e => { if (uploadType !== UPLOAD_TYPES.EXPENSE) e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
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
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#e8f0ff", marginBottom: 2 }}>
                  Note de frais
                </p>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.22)", fontWeight: 500 }}>
                  Tous les rôles
                </span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#5a6e99", fontWeight: 300, lineHeight: 1.5 }}>
              Remboursement de dépenses personnelles (transport, repas, hébergement…)
            </p>
          </div>

          {/* ── Bouton Facture fournisseur — COMPTABILITÉ UNIQUEMENT ── */}
          <div
            onClick={openInvoicePicker}
            title={role !== ROLES.Comptable ? "Accès réservé au rôle Comptabilité" : ""}
            style={{
              flex: "1 1 220px", padding: "20px 22px", borderRadius: 16,
              transition: "all 0.25s", position: "relative",
              // ✅ CORRECTION : utilise ROLES.Comptable partout
              cursor: role === ROLES.Comptable ? "pointer" : "not-allowed",
              opacity: role === ROLES.Comptable ? 1 : 0.45,
              background: uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE
                ? "linear-gradient(145deg,rgba(37,99,235,0.12),rgba(37,99,235,0.06))"
                : "linear-gradient(145deg,#0d1627,#0a1120)",
              border: uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE
                ? "1px solid rgba(37,99,235,0.55)"
                : "1px solid rgba(255,255,255,0.07)",
              boxShadow: uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE
                ? "0 0 24px rgba(37,99,235,0.14)"
                : "none",
            }}
            onMouseEnter={e => { if (role === ROLES.Comptable && uploadType !== UPLOAD_TYPES.SUPPLIER_INVOICE) e.currentTarget.style.borderColor = "rgba(37,99,235,0.35)"; }}
            onMouseLeave={e => { if (role === ROLES.Comptable && uploadType !== UPLOAD_TYPES.SUPPLIER_INVOICE) e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#e8f0ff", marginBottom: 2 }}>
                  Facture fournisseur
                </p>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(37,99,235,0.1)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.22)", fontWeight: 500 }}>
                  Comptabilité uniquement
                </span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#5a6e99", fontWeight: 300, lineHeight: 1.5 }}>
              Factures fournisseurs à intégrer dans la comptabilité (TVA, HT, TTC…)
            </p>

            {/* Icône cadenas si accès refusé */}
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

        {/* ── Message d'erreur accès refusé / erreur upload ───────────────── */}
        {error && (
          <div className="fe2" style={{
            marginBottom: 20, padding: "12px 16px", borderRadius: 12,
            background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
            color: "#f87171", fontSize: 13, display: "flex", alignItems: "center", gap: 10,
            animation: "fade-in 0.3s ease",
          }}>
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
        <input
          ref={inputExpenseRef}
          type="file"
          multiple
          accept="application/pdf,image/*"
          onChange={handlePick}
          style={{ display: "none" }}
        />
        {/* ✅ CORRECTION : utilise ROLES.Comptable */}
        <input
          ref={inputInvoiceRef}
          type="file"
          multiple
          accept="application/pdf,image/*"
          onChange={role === ROLES.Comptable ? handlePick : undefined}
          style={{ display: "none" }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          style={{ display: "none" }}
        />

        {/* ── Zone Drag & Drop ──────────────────────────────────────────────── */}
        <div
          className="fe3 surface-card"
          style={{
            padding: "50px 40px", textAlign: "center", marginBottom: 24,
            cursor: "pointer", transition: "all 0.35s",
            borderColor : dragging ? "rgba(37,99,235,0.65)" : undefined,
            boxShadow   : dragging ? "0 0 0 4px rgba(37,99,235,0.14), 0 8px 40px rgba(0,0,0,0.45)" : undefined,
            background  : dragging ? "rgba(37,99,235,0.05)" : undefined,
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            // ✅ CORRECTION : utilise ROLES.Comptable
            if (uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE && role !== ROLES.Comptable) {
              setError("Accès refusé : seul le rôle Comptabilité peut uploader des factures fournisseur.");
              return;
            }
            uploadType === UPLOAD_TYPES.SUPPLIER_INVOICE
              ? inputInvoiceRef.current?.click()
              : inputExpenseRef.current?.click();
          }}
        >
          {/* Icône upload */}
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,rgba(37,99,235,0.17),rgba(59,130,246,0.12))", border: "1px solid rgba(37,99,235,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: dragging ? "pulse-glow 1s ease infinite" : undefined }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

          {/* Boutons d'action */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>

            {/* Browse note de frais — tous */}
            <div
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, cursor: "pointer", background: "linear-gradient(135deg,#059669,#10b981)" }}
              onClick={openExpensePicker}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              Note de frais
            </div>

            {/* Browse facture fournisseur — comptabilité seulement */}
            {role === ROLES.Comptable && (
              <div
                className="btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}
                onClick={openInvoicePicker}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
                Facture fournisseur
              </div>
            )}

            {/* Bouton caméra */}
            <div
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, fontSize: 13, cursor: "pointer", background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)", color: "#93c5fd", fontFamily: "'Syne',sans-serif", fontWeight: 600, transition: "all 0.25s" }}
              onClick={() => cameraRef.current?.click()}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(37,99,235,0.18)"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(37,99,235,0.1)";  e.currentTarget.style.borderColor = "rgba(37,99,235,0.3)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: "#e8f0ff", marginBottom: 1 }}>Conseils pour une extraction OCR précise</p>
              <p style={{ fontSize: 11, color: "#3a4d72", fontWeight: 300 }}>Meilleure qualité de photo = extraction plus rapide et fiable</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            {[
              { icon: "☀️", tip: "Bonne luminosité",       desc: "Photographiez dans un endroit bien éclairé. La lumière naturelle est idéale." },
              { icon: "🔍", tip: "Mise au point nette",     desc: "Tenez votre appareil stable. Le texte doit être parfaitement lisible." },
              { icon: "📐", tip: "Alignement droit",        desc: "Posez la facture à plat. Évitez les angles et les déformations." },
              { icon: "📄", tip: "Couverture complète",     desc: "Capturez toute la facture sans couper les bords ni le contenu." },
              { icon: "🎨", tip: "Fond contrasté",          desc: "Posez la facture sur une surface sombre pour bien délimiter les bords." },
              { icon: "🚫", tip: "Pas d'ombres ni reflets", desc: "Éliminez les ombres et évitez les reflets sur le papier brillant." },
            ].map(({ icon, tip, desc }, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", transition: "border-color 0.25s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(37,99,235,0.25)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}
              >
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
                {uploading ? <><Spinner /> Upload en cours…</> : "Uploader"}
              </button>
            </div>

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
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#5a6e99", padding: 4, transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "#f87171"}
                  onMouseLeave={e => e.target.style.color = "#5a6e99"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Historique des uploads ────────────────────────────────────────── */}
        {uploaded.length > 0 && (
          <div className="fe4 surface-card" style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#e8f0ff", marginBottom: 16 }}>
              Fichiers uploadés
            </p>
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