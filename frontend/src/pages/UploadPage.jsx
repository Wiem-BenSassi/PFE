// ─── src/pages/UploadPage.jsx ────────────────────────────────────────────────
// Page d'upload des factures.
// Gère : drag & drop, sélection fichier, capture caméra, appel OCR backend.
// Après l'OCR réussi, appelle onOcrDone(ocrResult) pour passer à la vérification.

import { useState, useRef, useCallback } from "react";
import { Spinner, FileIcon } from "../components/Icons";

const UploadPage = ({ onUploaded, onOcrDone }) => {
  const [dragging,  setDragging]  = useState(false);   // fichier survolant la zone
  const [files,     setFiles]     = useState([]);       // fichiers en attente
  const [uploading, setUploading] = useState(false);   // requête en cours
  const [uploaded,  setUploaded]  = useState([]);      // fichiers uploadés avec succès

  const inputRef  = useRef(null);   // input fichier classique
  const cameraRef = useRef(null);   // input caméra mobile

  // ── Gestion des fichiers ──────────────────────────────────────────────────

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

  // ── Upload + appel OCR ────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);

      const res  = await fetch("http://127.0.0.1:8000/ocr/extract", { method: "POST", body: formData });
      const data = await res.json();

      // Normalise les noms de champs (snake_case ou camelCase)
      const ocrResult = {
        invoiceNumber: data.invoice_number ?? data.invoiceNumber ?? "",
        invoiceDate:   data.invoice_date   ?? data.invoiceDate   ?? "",
        supplierName:  data.supplier_name  ?? data.supplierName  ?? "",
        totalAmount:   data.total_amount   ?? data.totalAmount   ?? "",
      };

      const newUploaded = files.map(f => ({
        name: f.name,
        size: (f.size / 1024).toFixed(1) + " KB",
        date: "Just now",
      }));

      if (onUploaded) onUploaded(newUploaded);
      setUploaded(prev => [...prev, ...newUploaded]);
      setFiles([]);
      setUploading(false);

      // Déclenche la page de vérification avec les données OCR
      if (onOcrDone) onOcrDone(ocrResult);

    } catch (err) {
      console.error("OCR error:", err);
      setUploading(false);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", padding: "80px 28px 40px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* En-tête */}
        <div className="fe1" style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Invoice Management</p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 30, fontWeight: 800, color: "#e8f0ff", marginBottom: 6, letterSpacing: "-0.3px" }}>
            Upload <span style={{ color: "#3b82f6" }}>Invoices</span>
          </h1>
          <p style={{ color: "#5a6e99", fontSize: 14, fontWeight: 300 }}>Upload PDF or image invoices from your automotive suppliers.</p>
        </div>

        {/* ── Zone Drag & Drop ──────────────────────────────────────────────── */}
        <div
          className="fe2 surface-card"
          style={{ padding: "60px 40px", textAlign: "center", marginBottom: 24, cursor: "pointer", transition: "all 0.35s", borderColor: dragging ? "rgba(37,99,235,0.65)" : undefined, boxShadow: dragging ? "0 0 0 4px rgba(37,99,235,0.14), 0 8px 40px rgba(0,0,0,0.45)" : undefined, background: dragging ? "rgba(37,99,235,0.05)" : undefined }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          {/* Inputs cachés */}
          <input ref={inputRef} type="file" multiple accept="application/pdf,image/*" onChange={handlePick} style={{ display: "none" }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} style={{ display: "none" }} />

          {/* Icône upload */}
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,rgba(37,99,235,0.17),rgba(59,130,246,0.12))", border: "1px solid rgba(37,99,235,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: dragging ? "pulse-glow 1s ease infinite" : undefined }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>

          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "#e8f0ff", marginBottom: 8 }}>
            {dragging ? "Drop files here" : "Drag & drop your files"}
          </p>
          <p style={{ color: "#5a6e99", fontSize: 13, marginBottom: 20 }}>Supports PDF, JPG, PNG · Max 20MB per file</p>

          {/* Boutons Browse et Take Photo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
            <div className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 10, fontSize: 13, cursor: "pointer" }} onClick={() => inputRef.current?.click()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Browse files
            </div>
            <div
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10, fontSize: 13, cursor: "pointer", background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)", color: "#93c5fd", fontFamily: "'Syne',sans-serif", fontWeight: 600, transition: "all 0.25s" }}
              onClick={() => cameraRef.current?.click()}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(37,99,235,0.18)"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(37,99,235,0.1)";  e.currentTarget.style.borderColor = "rgba(37,99,235,0.3)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Take Photo
            </div>
          </div>
        </div>

        {/* ── Conseils OCR ─────────────────────────────────────────────────── */}
        <div className="fe3 surface-card" style={{ padding: "20px 24px", marginBottom: 24, borderLeft: "3px solid rgba(37,99,235,0.55)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: "#e8f0ff", marginBottom: 1 }}>Tips for accurate OCR extraction</p>
              <p style={{ fontSize: 11, color: "#3a4d72", fontWeight: 300 }}>Better photo quality = faster, more reliable data extraction</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            {[
              { icon: "☀️", tip: "Good lighting",         desc: "Shoot in a well-lit area. Natural daylight works best — avoid dim indoor light." },
              { icon: "🔍", tip: "Sharp focus",            desc: "Hold your device steady. Ensure the text is crisp and fully legible before capturing." },
              { icon: "📐", tip: "Straight alignment",     desc: "Keep the invoice flat and level. Avoid angles, bends, or perspective distortion." },
              { icon: "📄", tip: "Full coverage",          desc: "Capture the entire invoice in frame — no edges cropped, no content cut off." },
              { icon: "🎨", tip: "Contrasted background",  desc: "Place the invoice on a dark or solid-color surface to clearly define its edges." },
              { icon: "🚫", tip: "No shadows or glare",    desc: "Remove any shadows cast over the text and avoid glossy reflections on the page." },
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

        {/* ── Fichiers en attente ───────────────────────────────────────────── */}
        {files.length > 0 && (
          <div className="fe3 surface-card" style={{ padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#e8f0ff" }}>
                {files.length} file{files.length > 1 ? "s" : ""} ready to upload
              </p>
              <button className="btn-primary" onClick={handleUpload} disabled={uploading} style={{ padding: "9px 22px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                {uploading ? <><Spinner />Uploading…</> : "Upload all"}
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
                <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5a6e99", padding: 4, transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = "#f87171"} onMouseLeave={e => e.target.style.color = "#5a6e99"}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Historique des uploads ────────────────────────────────────────── */}
        {uploaded.length > 0 && (
          <div className="fe4 surface-card" style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#e8f0ff", marginBottom: 16 }}>Uploaded files</p>
            {uploaded.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(16,185,129,0.04)", marginBottom: 8, border: "1px solid rgba(16,185,129,0.12)", animation: "fade-in 0.4s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <FileIcon color="#10b981" />
                  <div>
                    <p style={{ fontSize: 13, color: "#e8f0ff" }}>{f.name}</p>
                    <p style={{ fontSize: 11, color: "#5a6e99" }}>{f.size} · {f.date}</p>
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)", fontWeight: 500 }}>
                  Uploaded ✓
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