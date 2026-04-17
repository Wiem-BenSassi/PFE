// ─── src/pages/ArchivePage.jsx ────────────────────────────────────────────────
// RESPONSIVE : tableau desktop → cartes mobile
// Props : archivedFiles, removeFromArchive, clearArchive

import { useState, useMemo, useEffect } from "react";

const PAGE_SIZE = 8;

const TYPE_LABELS = {
  expense          : "Note de frais",
  supplier_invoice : "Facture fournisseur",
};
const TYPE_COLORS = {
  expense          : { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.28)",  text: "#10b981" },
  supplier_invoice : { bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.28)",  text: "#60a5fa" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const isInRange = (dateStr, range) => {
  if (range === "all") return true;
  const [datePart] = dateStr.split(" ");
  const [dd, mm, yyyy] = datePart.split("/").map(Number);
  const fileDate = new Date(yyyy, mm - 1, dd);
  const now      = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today") return fileDate >= today;
  if (range === "week")  { const w = new Date(today); w.setDate(today.getDate()-7); return fileDate >= w; }
  if (range === "month") return fileDate >= new Date(now.getFullYear(), now.getMonth(), 1);
  return true;
};

// ── Icônes ────────────────────────────────────────────────────────────────────
const Ico = {
  Archive: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  Search:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Eye:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Trash:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6M14,11v6M9,6V4h6v2"/></svg>,
  File:    ({ type }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={type === "supplier_invoice" ? "#60a5fa" : "#10b981"} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
  Left:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>,
  Right:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>,
  Warn:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ── Confirm modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ file, onConfirm, onCancel }) => (
  <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",animation:"fade-in 0.2s ease",padding:16 }} onClick={onCancel}>
    <div style={{ background:"linear-gradient(145deg,#0d1627,#0a1120)",border:"1px solid rgba(248,113,113,0.35)",borderRadius:20,padding:"28px 24px",maxWidth:340,width:"100%",textAlign:"center",animation:"slide-up 0.3s cubic-bezier(0.22,1,0.36,1)",boxShadow:"0 24px 64px rgba(0,0,0,0.7)" }} onClick={e=>e.stopPropagation()}>
      <div style={{ width:52,height:52,borderRadius:"50%",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}><Ico.Trash /></div>
      <p style={{ fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:"#e8f0ff",marginBottom:8 }}>Supprimer de l'archive ?</p>
      <p style={{ fontSize:13,color:"#5a6e99",fontWeight:300,marginBottom:24,lineHeight:1.6 }}><span style={{ color:"#c0cfee" }}>{file?.name}</span> sera retiré définitivement.</p>
      <div style={{ display:"flex",gap:12,justifyContent:"center" }}>
        <button onClick={onCancel} style={{ padding:"11px 24px",borderRadius:10,fontSize:14,fontWeight:500,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#c0cfee",cursor:"pointer",minHeight:44 }}>Annuler</button>
        <button onClick={onConfirm} style={{ padding:"11px 24px",borderRadius:10,fontSize:14,fontWeight:600,background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.4)",color:"#f87171",cursor:"pointer",minHeight:44 }}>Supprimer</button>
      </div>
    </div>
  </div>
);

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ type, message }) => (
  <div style={{ position:"fixed",bottom:28,right:16,left:16,zIndex:9998,maxWidth:340,margin:"0 auto",padding:"12px 18px",borderRadius:12,fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8,animation:"slide-in-right 0.35s cubic-bezier(0.22,1,0.36,1)",background:type==="error"?"rgba(248,113,113,0.12)":"rgba(16,185,129,0.12)",border:`1px solid ${type==="error"?"rgba(248,113,113,0.4)":"rgba(16,185,129,0.4)"}`,color:type==="error"?"#f87171":"#10b981",boxShadow:"0 8px 32px rgba(0,0,0,0.45)" }}>
    {type==="error"?<Ico.Warn />:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>}
    {message}
  </div>
);

// ── Badge filtre ──────────────────────────────────────────────────────────────
const FilterBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{ padding:"8px 14px",borderRadius:20,fontSize:13,fontWeight:500,cursor:"pointer",minHeight:36,background:active?"rgba(37,99,235,0.2)":"rgba(255,255,255,0.04)",border:active?"1px solid rgba(37,99,235,0.5)":"1px solid rgba(255,255,255,0.08)",color:active?"#93c5fd":"#5a6e99",transition:"all 0.2s",whiteSpace:"nowrap" }}>
    {children}
  </button>
);

// ══════════════════════════════════════════════════════════════════════════════
const ArchivePage = ({ archivedFiles = [], removeFromArchive, clearArchive }) => {

  const [search,     setSearch]     = useState("");
  const [dateRange,  setDateRange]  = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page,       setPage]       = useState(1);
  const [toDelete,   setToDelete]   = useState(null);
  const [toast,      setToast]      = useState(null);
  const [isMobile,   setIsMobile]   = useState(window.innerWidth < 700);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = useMemo(() => archivedFiles.filter(f => {
    const s = f.name.toLowerCase().includes(search.toLowerCase().trim());
    const d = isInRange(f.date, dateRange);
    const t = typeFilter === "all" || f.type === typeFilter;
    return s && d && t;
  }), [archivedFiles, search, dateRange, typeFilter]);

  const handleSearchChange = (v) => { setSearch(v);     setPage(1); };
  const handleDateChange   = (v) => { setDateRange(v);  setPage(1); };
  const handleTypeChange   = (v) => { setTypeFilter(v); setPage(1); };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleView = (file) => {
    if (!file.dataUrl) { showToast("error", "Aperçu indisponible."); return; }
    const win = window.open();
    if (win) {
      win.document.write(`<html><head><title>${file.name}</title></head><body style="margin:0;background:#111"><iframe src="${file.dataUrl}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
    }
  };

  const confirmDelete = () => {
    if (toDelete) {
      removeFromArchive(toDelete.id);
      setToDelete(null);
      showToast("success", "Fichier supprimé de l'archive.");
      const newTotal = Math.max(1, Math.ceil((filtered.length - 1) / PAGE_SIZE));
      if (page > newTotal) setPage(newTotal);
    }
  };

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingTop:"var(--nav-h)", minHeight:"100vh", padding:"calc(var(--nav-h) + 24px) var(--page-px) 48px", position:"relative", zIndex:1 }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div className="fe1" style={{ marginBottom:28, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <p style={{ fontSize:12, color:"#5a6e99", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Stockage local</p>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:isMobile?24:30, fontWeight:800, color:"#e8f0ff", marginBottom:6, letterSpacing:"-0.3px", display:"flex", alignItems:"center", gap:10 }}>
              <Ico.Archive />
              Archive <span style={{ color:"#3b82f6" }}>&nbsp;Factures</span>
            </h1>
            <p style={{ color:"#5a6e99", fontSize:14, fontWeight:300 }}>
              {archivedFiles.length} fichier{archivedFiles.length !== 1 ? "s" : ""} archivé{archivedFiles.length !== 1 ? "s" : ""}
            </p>
          </div>

          {archivedFiles.length > 0 && (
            <button
              onClick={() => { if (window.confirm("Vider entièrement l'archive ?")) { clearArchive(); setPage(1); showToast("success","Archive vidée."); } }}
              style={{ padding:"10px 16px", borderRadius:10, fontSize:13, fontWeight:500, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.28)", color:"#f87171", cursor:"pointer", display:"flex", alignItems:"center", gap:8, minHeight:44, transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(248,113,113,0.15)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(248,113,113,0.08)"}
            >
              <Ico.Trash /> {isMobile ? "Vider" : "Vider l'archive"}
            </button>
          )}
        </div>

        {/* ── Barre de recherche + filtres ────────────────────────────────── */}
        <div className="fe2 surface-card" style={{ padding:"16px", marginBottom:16, display:"flex", flexDirection:"column", gap:12 }}>

          {/* Recherche */}
          <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"10px 14px" }}>
            <span style={{ color:"#3a4d72", flexShrink:0 }}><Ico.Search /></span>
            <input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Rechercher par nom…"
              style={{ background:"transparent", border:"none", outline:"none", color:"#e8f0ff", fontSize:15, fontFamily:"'DM Sans',sans-serif", flex:1, minWidth:0 }}
            />
            {search && (
              <button onClick={() => handleSearchChange("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#5a6e99", padding:"2px 6px", fontSize:16, lineHeight:1 }}>✕</button>
            )}
          </div>

          {/* Filtres — scrollables horizontalement sur mobile */}
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2, scrollbarWidth:"none" }}>
            {[["all","Tout"],["today","Aujourd'hui"],["week","7 jours"],["month","Ce mois"]].map(([v,l]) => (
              <FilterBtn key={v} active={dateRange===v} onClick={() => handleDateChange(v)}>{l}</FilterBtn>
            ))}
            <div style={{ width:1, flexShrink:0, background:"rgba(255,255,255,0.1)", margin:"0 4px" }} />
            {[["all","Tous"],["expense","Frais"],["supplier_invoice","Fournisseur"]].map(([v,l]) => (
              <FilterBtn key={v} active={typeFilter===v} onClick={() => handleTypeChange(v)}>{l}</FilterBtn>
            ))}
          </div>
        </div>

        {/* ── Tableau (desktop) / Cartes (mobile) ─────────────────────────── */}
        <div className="fe3 surface-card" style={{ overflow:"hidden" }}>

          {/* En-tête tableau — visible uniquement desktop */}
          {!isMobile && (
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 0.8fr 1fr 100px", padding:"14px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)" }}>
              {["Nom du fichier","Date d'upload","Taille","Type","Actions"].map((h, i) => (
                <span key={i} style={{ fontSize:11, color:"#3a4d72", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600, textAlign:i===4?"center":"left" }}>{h}</span>
              ))}
            </div>
          )}

          {/* Lignes / Cartes */}
          {paginated.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ width:60, height:60, borderRadius:16, background:"rgba(37,99,235,0.07)", border:"1px solid rgba(37,99,235,0.14)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <Ico.Archive />
              </div>
              <p style={{ fontSize:14, color:"#5a6e99" }}>
                {archivedFiles.length === 0 ? "Aucune facture archivée." : "Aucun résultat."}
              </p>
              <p style={{ fontSize:12, color:"#2a3550", marginTop:6 }}>
                {archivedFiles.length === 0 ? "Uploadez une facture pour la voir ici." : "Élargissez vos filtres."}
              </p>
            </div>
          ) : (
            paginated.map((file, idx) => {
              const tc = TYPE_COLORS[file.type] || TYPE_COLORS.expense;

              // ── VERSION MOBILE : carte ────────────────────────────────────
              if (isMobile) {
                return (
                  <div key={file.id} style={{ padding:"16px", borderBottom: idx < paginated.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none", animation:"fade-in 0.3s ease" }}>
                    {/* Ligne 1 : icône + nom */}
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:tc.bg, border:`1px solid ${tc.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Ico.File type={file.type} />
                      </div>
                      <p style={{ fontSize:14, color:"#e8f0ff", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }} title={file.name}>
                        {file.name}
                      </p>
                    </div>

                    {/* Ligne 2 : méta-données */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, flexWrap:"wrap" }}>
                      <span style={{ fontSize:12, color:"#5a6e99" }}>{file.date}</span>
                      <span style={{ fontSize:10, color:"#3a4d72" }}>·</span>
                      <span style={{ fontSize:12, color:"#5a6e99" }}>{file.size}</span>
                      <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:500, background:tc.bg, border:`1px solid ${tc.border}`, color:tc.text }}>
                        {TYPE_LABELS[file.type] || file.type}
                      </span>
                    </div>

                    {/* Ligne 3 : actions */}
                    <div style={{ display:"flex", gap:10 }}>
                      <button
                        onClick={() => handleView(file)}
                        style={{ flex:1, padding:"10px", borderRadius:10, fontSize:13, fontWeight:500, background:file.dataUrl?"rgba(37,99,235,0.12)":"rgba(255,255,255,0.04)", border:file.dataUrl?"1px solid rgba(37,99,235,0.3)":"1px solid rgba(255,255,255,0.08)", color:file.dataUrl?"#60a5fa":"#3a4d72", cursor:file.dataUrl?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:6, minHeight:44 }}
                      >
                        <Ico.Eye /> Voir
                      </button>
                      <button
                        onClick={() => setToDelete(file)}
                        style={{ flex:1, padding:"10px", borderRadius:10, fontSize:13, fontWeight:500, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", color:"#f87171", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, minHeight:44 }}
                      >
                        <Ico.Trash /> Supprimer
                      </button>
                    </div>
                  </div>
                );
              }

              // ── VERSION DESKTOP : ligne de tableau ────────────────────────
              return (
                <div
                  key={file.id}
                  style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 0.8fr 1fr 100px", padding:"14px 24px", borderBottom:idx < paginated.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none", alignItems:"center", transition:"background 0.2s", animation:"fade-in 0.3s ease" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.025)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:tc.bg, border:`1px solid ${tc.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Ico.File type={file.type} />
                    </div>
                    <span style={{ fontSize:13, color:"#e8f0ff", fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={file.name}>{file.name}</span>
                  </div>
                  <span style={{ fontSize:12, color:"#5a6e99" }}>{file.date}</span>
                  <span style={{ fontSize:12, color:"#5a6e99", fontFamily:"'Syne',sans-serif" }}>{file.size}</span>
                  <span style={{ fontSize:11, padding:"4px 10px", borderRadius:20, fontWeight:500, display:"inline-block", width:"fit-content", background:tc.bg, border:`1px solid ${tc.border}`, color:tc.text }}>
                    {TYPE_LABELS[file.type] || file.type}
                  </span>
                  <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                    <button
                      onClick={() => handleView(file)}
                      title={file.dataUrl ? "Voir" : "Aperçu indisponible"}
                      style={{ padding:"6px 10px", borderRadius:8, fontSize:12, fontWeight:500, background:file.dataUrl?"rgba(37,99,235,0.12)":"rgba(255,255,255,0.04)", border:file.dataUrl?"1px solid rgba(37,99,235,0.3)":"1px solid rgba(255,255,255,0.08)", color:file.dataUrl?"#60a5fa":"#3a4d72", cursor:file.dataUrl?"pointer":"not-allowed", display:"flex", alignItems:"center", gap:5, transition:"all 0.2s" }}
                      onMouseEnter={e=>{if(file.dataUrl) e.currentTarget.style.background="rgba(37,99,235,0.2)";}}
                      onMouseLeave={e=>{if(file.dataUrl) e.currentTarget.style.background="rgba(37,99,235,0.12)";}}
                    >
                      <Ico.Eye /> Voir
                    </button>
                    <button
                      onClick={() => setToDelete(file)}
                      style={{ padding:"6px 10px", borderRadius:8, fontSize:12, fontWeight:500, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", color:"#f87171", cursor:"pointer", display:"flex", alignItems:"center", gap:5, transition:"all 0.2s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(248,113,113,0.18)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(248,113,113,0.08)"}
                    >
                      <Ico.Trash />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="fe4" style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginTop:20, flexWrap:"wrap" }}>
            <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}
              style={{ padding:"8px 14px", borderRadius:9, fontSize:13, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:page===1?"#2a3550":"#c0cfee", cursor:page===1?"default":"pointer", display:"flex", alignItems:"center", gap:4, minHeight:40 }}>
              <Ico.Left /> Précédent
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                style={{ width:38, height:38, borderRadius:9, fontSize:13, fontWeight:500, background:page===n?"rgba(37,99,235,0.2)":"rgba(255,255,255,0.04)", border:page===n?"1px solid rgba(37,99,235,0.5)":"1px solid rgba(255,255,255,0.08)", color:page===n?"#93c5fd":"#5a6e99", cursor:"pointer", transition:"all 0.2s" }}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{ padding:"8px 14px", borderRadius:9, fontSize:13, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:page===totalPages?"#2a3550":"#c0cfee", cursor:page===totalPages?"default":"pointer", display:"flex", alignItems:"center", gap:4, minHeight:40 }}>
              Suivant <Ico.Right />
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <p style={{ textAlign:"center", fontSize:11, color:"#2a3550", marginTop:12 }}>
            {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} sur {filtered.length}
          </p>
        )}
      </div>

      {toDelete && <ConfirmModal file={toDelete} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />}
      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
};

export default ArchivePage;