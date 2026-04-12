// ─── src/pages/ArchivePage.jsx ────────────────────────────────────────────────
// Page d'archivage des factures — 100 % côté client (localStorage).
//
// Fonctionnalités :
//   • Tableau des factures archivées (nom, date, taille, type)
//   • Bouton "Voir"      → ouvre le fichier dans un nouvel onglet (dataUrl)
//   • Bouton "Supprimer" → retire l'entrée de l'archive + localStorage
//   • Barre de recherche par nom (temps réel)
//   • Filtre par date    → Aujourd'hui / Cette semaine / Ce mois / Tout
//   • Filtre par type    → Tous / Note de frais / Facture fournisseur
//   • Pagination         → 8 entrées par page
//   • États vides et gestion d'erreur (fichier sans dataUrl)
//
// Props :
//   archivedFiles     {Array}    — liste issue de useArchive
//   removeFromArchive {Function} — supprime un fichier par son id
//   clearArchive      {Function} — vide toute l'archive

import { useState, useMemo } from "react";

// ── Constantes ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 8;

// Labels affichés pour les types de fichiers
const TYPE_LABELS = {
  expense          : "Note de frais",
  supplier_invoice : "Facture fournisseur",
};

// Couleurs associées aux types
const TYPE_COLORS = {
  expense          : { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.28)",  text: "#10b981" },
  supplier_invoice : { bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.28)",  text: "#60a5fa" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Renvoie true si une date "DD/MM/YYYY HH:MM" tombe dans la fenêtre choisie */
const isInRange = (dateStr, range) => {
  if (range === "all") return true;
  // Parse "DD/MM/YYYY HH:MM"
  const [datePart] = dateStr.split(" ");
  const [dd, mm, yyyy] = datePart.split("/").map(Number);
  const fileDate = new Date(yyyy, mm - 1, dd);
  const now      = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === "today") {
    return fileDate >= today;
  }
  if (range === "week") {
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    return fileDate >= weekAgo;
  }
  if (range === "month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return fileDate >= monthStart;
  }
  return true;
};

// ── Icônes inline ─────────────────────────────────────────────────────────────
const IconArchive = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21,8 21,21 3,21 3,8"/>
    <rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
);

const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconEye = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19,6l-1,14H6L5,6"/>
    <path d="M10,11v6"/>
    <path d="M14,11v6"/>
    <path d="M9,6V4h6v2"/>
  </svg>
);

const IconFile = ({ type }) => {
  const color = type === "supplier_invoice" ? "#60a5fa" : "#10b981";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
    </svg>
  );
};

const IconChevron = ({ dir = "right" }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    {dir === "left"
      ? <polyline points="15,18 9,12 15,6"/>
      : <polyline points="9,18 15,12 9,6"/>}
  </svg>
);

const IconWarning = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ── Modal de confirmation ─────────────────────────────────────────────────────
const ConfirmModal = ({ file, onConfirm, onCancel }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
    animation: "fade-in 0.2s ease",
  }} onClick={onCancel}>
    <div style={{
      background: "linear-gradient(145deg,#0d1627,#0a1120)",
      border: "1px solid rgba(248,113,113,0.35)",
      borderRadius: 20, padding: "32px 36px",
      maxWidth: 360, width: "90%", textAlign: "center",
      animation: "slide-up 0.3s cubic-bezier(0.22,1,0.36,1)",
      boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
    }} onClick={e => e.stopPropagation()}>

      {/* Icône */}
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
      }}>
        <IconTrash />
      </div>

      <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 700, color: "#e8f0ff", marginBottom: 8 }}>
        Supprimer de l'archive ?
      </p>
      <p style={{ fontSize: 13, color: "#5a6e99", fontWeight: 300, marginBottom: 24, lineHeight: 1.6 }}>
        <span style={{ color: "#c0cfee" }}>{file?.name}</span> sera retiré définitivement de l'archive locale.
      </p>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {/* Annuler */}
        <button
          onClick={onCancel}
          style={{
            padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 500,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#c0cfee", cursor: "pointer",
          }}
        >
          Annuler
        </button>
        {/* Confirmer */}
        <button
          onClick={onConfirm}
          style={{
            padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)",
            color: "#f87171", cursor: "pointer",
          }}
        >
          Supprimer
        </button>
      </div>
    </div>
  </div>
);

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ type, message }) => (
  <div style={{
    position: "fixed", bottom: 28, right: 28, zIndex: 9998,
    padding: "12px 18px", borderRadius: 12, fontSize: 13, fontWeight: 500,
    display: "flex", alignItems: "center", gap: 8,
    animation: "slide-in-right 0.35s cubic-bezier(0.22,1,0.36,1)",
    background: type === "error" ? "rgba(248,113,113,0.12)" : "rgba(16,185,129,0.12)",
    border: `1px solid ${type === "error" ? "rgba(248,113,113,0.4)" : "rgba(16,185,129,0.4)"}`,
    color: type === "error" ? "#f87171" : "#10b981",
    boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
  }}>
    {type === "error" ? <IconWarning /> : (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20,6 9,17 4,12"/>
      </svg>
    )}
    {message}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
const ArchivePage = ({ archivedFiles = [], removeFromArchive, clearArchive }) => {

  // ── État local ──────────────────────────────────────────────────────────────
  const [search,     setSearch]     = useState("");       // filtre par nom
  const [dateRange,  setDateRange]  = useState("all");    // today | week | month | all
  const [typeFilter, setTypeFilter] = useState("all");    // all | expense | supplier_invoice
  const [page,       setPage]       = useState(1);        // pagination
  const [toDelete,   setToDelete]   = useState(null);     // fichier à confirmer pour suppression
  const [toast,      setToast]      = useState(null);     // { type, message }

  // ── Affichage d'un toast éphémère ───────────────────────────────────────────
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Filtrage + recherche ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return archivedFiles.filter(f => {
      const matchSearch = f.name.toLowerCase().includes(search.toLowerCase().trim());
      const matchDate   = isInRange(f.date, dateRange);
      const matchType   = typeFilter === "all" || f.type === typeFilter;
      return matchSearch && matchDate && matchType;
    });
  }, [archivedFiles, search, dateRange, typeFilter]);

  // Handlers de filtres — réinitialisent la page à 1 à chaque changement
  const handleSearchChange  = (val) => { setSearch(val);     setPage(1); };
  const handleDateChange    = (val) => { setDateRange(val);  setPage(1); };
  const handleTypeChange    = (val) => { setTypeFilter(val); setPage(1); };

  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Actions ─────────────────────────────────────────────────────────────────

  /** Ouvre le fichier dans un nouvel onglet via son dataUrl */
  const handleView = (file) => {
    if (!file.dataUrl) {
      showToast("error", "Aperçu indisponible — fichier non stocké localement.");
      return;
    }
    const win = window.open();
    if (win) {
      win.document.write(
        `<html><head><title>${file.name}</title></head><body style="margin:0;background:#111">` +
        `<iframe src="${file.dataUrl}" style="width:100%;height:100vh;border:none"></iframe>` +
        `</body></html>`
      );
    }
  };

  /** Demande confirmation avant de supprimer */
  const askDelete = (file) => setToDelete(file);

  const confirmDelete = () => {
    if (toDelete) {
      removeFromArchive(toDelete.id);
      setToDelete(null);
      showToast("success", "Fichier supprimé de l'archive.");
      // Si on était sur la dernière page et qu'elle devient vide, reculer
      const newTotal = Math.max(1, Math.ceil((filtered.length - 1) / PAGE_SIZE));
      if (page > newTotal) setPage(newTotal);
    }
  };

  // ── Style partagé pour les badges de filtre ──────────────────────────────
  const filterBtn = (active) => ({
    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
    cursor: "pointer",
    background: active ? "rgba(37,99,235,0.2)"          : "rgba(255,255,255,0.04)",
    border    : active ? "1px solid rgba(37,99,235,0.5)" : "1px solid rgba(255,255,255,0.08)",
    color     : active ? "#93c5fd"                        : "#5a6e99",
    transition: "all 0.2s",
  });

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", padding: "80px 28px 48px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div className="fe1" style={{ marginBottom: 32, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              Stockage local
            </p>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 30, fontWeight: 800, color: "#e8f0ff", marginBottom: 6, letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: 12 }}>
              <IconArchive />
              Archive des <span style={{ color: "#3b82f6" }}>&nbsp;Factures</span>
            </h1>
            <p style={{ color: "#5a6e99", fontSize: 14, fontWeight: 300 }}>
              {archivedFiles.length} fichier{archivedFiles.length !== 1 ? "s" : ""} archivé{archivedFiles.length !== 1 ? "s" : ""} dans votre navigateur.
            </p>
          </div>

          {/* Bouton vider l'archive */}
          {archivedFiles.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Vider entièrement l'archive ? Cette action est irréversible.")) {
                  clearArchive();
                  setPage(1);
                  showToast("success", "Archive vidée.");
                }
              }}
              style={{
                padding: "9px 18px", borderRadius: 10, fontSize: 12, fontWeight: 500,
                background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.28)",
                color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
            >
              <IconTrash /> Vider l'archive
            </button>
          )}
        </div>

        {/* ── Barre de recherche ───────────────────────────────────────────── */}
        <div className="fe2 surface-card" style={{ padding: "18px 20px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>

          {/* Recherche par nom */}
          <div style={{
            flex: "1 1 220px", display: "flex", alignItems: "center", gap: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "8px 14px",
          }}>
            <span style={{ color: "#3a4d72" }}><IconSearch /></span>
            <input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Rechercher par nom…"
              style={{
                background: "transparent", border: "none", outline: "none",
                color: "#e8f0ff", fontSize: 13, fontFamily: "'DM Sans',sans-serif", flex: 1,
              }}
            />
            {search && (
              <button onClick={() => handleSearchChange("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#5a6e99", padding: 0 }}>✕</button>
            )}
          </div>

          {/* Filtre date */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["all","Tout"],["today","Aujourd'hui"],["week","7 jours"],["month","Ce mois"]].map(([val, label]) => (
              <button key={val} style={filterBtn(dateRange === val)} onClick={() => handleDateChange(val)}>
                {label}
              </button>
            ))}
          </div>

          {/* Filtre type */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["all","Tous"],["expense","Notes de frais"],["supplier_invoice","Factures fourn."]].map(([val, label]) => (
              <button key={val} style={filterBtn(typeFilter === val)} onClick={() => handleTypeChange(val)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tableau / Liste ──────────────────────────────────────────────── */}
        <div className="fe3 surface-card" style={{ padding: "0", overflow: "hidden" }}>

          {/* En-tête du tableau */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 0.8fr 1fr 100px",
            padding: "14px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}>
            {["Nom du fichier", "Date d'upload", "Taille", "Type", "Actions"].map((h, i) => (
              <span key={i} style={{
                fontSize: 11, color: "#3a4d72", textTransform: "uppercase",
                letterSpacing: "0.07em", fontWeight: 600,
                textAlign: i === 4 ? "center" : "left",
              }}>{h}</span>
            ))}
          </div>

          {/* Lignes */}
          {paginated.length === 0 ? (
            /* ── État vide ────────────────────────────────────────────────── */
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <IconArchive />
              </div>
              <p style={{ fontSize: 14, color: "#5a6e99", fontWeight: 400, marginBottom: 6 }}>
                {archivedFiles.length === 0
                  ? "Aucune facture archivée pour le moment."
                  : "Aucun résultat pour ces filtres."}
              </p>
              <p style={{ fontSize: 12, color: "#2a3550", fontWeight: 300 }}>
                {archivedFiles.length === 0
                  ? "Uploadez une facture depuis la page Upload — elle sera automatiquement archivée ici."
                  : "Essayez d'élargir vos filtres ou votre recherche."}
              </p>
            </div>
          ) : (
            paginated.map((file, idx) => {
              const typeColor = TYPE_COLORS[file.type] || TYPE_COLORS.expense;
              const isLast    = idx === paginated.length - 1;

              return (
                <div
                  key={file.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.2fr 0.8fr 1fr 100px",
                    padding: "14px 24px",
                    borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
                    alignItems: "center",
                    transition: "background 0.2s",
                    animation: "fade-in 0.3s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Nom */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: typeColor.bg, border: `1px solid ${typeColor.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <IconFile type={file.type} />
                    </div>
                    <span style={{
                      fontSize: 13, color: "#e8f0ff", fontWeight: 500,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }} title={file.name}>
                      {file.name}
                    </span>
                  </div>

                  {/* Date */}
                  <span style={{ fontSize: 12, color: "#5a6e99" }}>{file.date}</span>

                  {/* Taille */}
                  <span style={{ fontSize: 12, color: "#5a6e99", fontFamily: "'Syne',sans-serif" }}>{file.size}</span>

                  {/* Type */}
                  <span style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 20, fontWeight: 500,
                    display: "inline-block", width: "fit-content",
                    background: typeColor.bg, border: `1px solid ${typeColor.border}`, color: typeColor.text,
                  }}>
                    {TYPE_LABELS[file.type] || file.type}
                  </span>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>

                    {/* Voir */}
                    <button
                      onClick={() => handleView(file)}
                      title={file.dataUrl ? "Voir le fichier" : "Aperçu indisponible"}
                      style={{
                        padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                        background: file.dataUrl ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.04)",
                        border: file.dataUrl ? "1px solid rgba(37,99,235,0.3)" : "1px solid rgba(255,255,255,0.08)",
                        color: file.dataUrl ? "#60a5fa" : "#3a4d72",
                        cursor: file.dataUrl ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { if (file.dataUrl) e.currentTarget.style.background = "rgba(37,99,235,0.2)"; }}
                      onMouseLeave={e => { if (file.dataUrl) e.currentTarget.style.background = "rgba(37,99,235,0.12)"; }}
                    >
                      <IconEye /> Voir
                    </button>

                    {/* Supprimer */}
                    <button
                      onClick={() => askDelete(file)}
                      title="Supprimer de l'archive"
                      style={{
                        padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                        background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
                        color: "#f87171", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.18)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="fe4" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 20 }}>

            {/* Précédent */}
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "7px 12px", borderRadius: 9, fontSize: 12,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: page === 1 ? "#2a3550" : "#c0cfee", cursor: page === 1 ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <IconChevron dir="left" /> Précédent
            </button>

            {/* Numéros de page */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                style={{
                  width: 34, height: 34, borderRadius: 9, fontSize: 13, fontWeight: 500,
                  background: page === n ? "rgba(37,99,235,0.2)" : "rgba(255,255,255,0.04)",
                  border: page === n ? "1px solid rgba(37,99,235,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  color: page === n ? "#93c5fd" : "#5a6e99",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {n}
              </button>
            ))}

            {/* Suivant */}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: "7px 12px", borderRadius: 9, fontSize: 12,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: page === totalPages ? "#2a3550" : "#c0cfee", cursor: page === totalPages ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              Suivant <IconChevron dir="right" />
            </button>
          </div>
        )}

        {/* Compteur résultats */}
        {filtered.length > 0 && (
          <p style={{ textAlign: "center", fontSize: 11, color: "#2a3550", marginTop: 12 }}>
            Affichage {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* ── Modal confirmation suppression ──────────────────────────────── */}
      {toDelete && (
        <ConfirmModal
          file={toDelete}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
};

export default ArchivePage;