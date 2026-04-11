// src/pages/AdminPage.jsx
// ─────────────────────────────────────────────────────────────
// Page administrateur : gestion des seuils + consommation + accès BudgetAdminPage
// Accessible uniquement aux rôles Admin / Admin Système
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000/admin";

// ── Helper fetch avec header rôle ─────────────────────────────
const apiFetch = (url, opts = {}) =>
  fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

// ── Badge statut ───────────────────────────────────────────────
const StatusBadge = ({ active }) => (
  <span style={{
    display       : "inline-flex",
    alignItems    : "center",
    gap           : 5,
    padding       : "3px 10px",
    borderRadius  : 20,
    fontSize      : 11,
    fontWeight    : 600,
    background    : active ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)",
    color         : active ? "#10b981" : "#f87171",
    border        : `1px solid ${active ? "rgba(16,185,129,0.3)" : "rgba(248,113,113,0.3)"}`,
  }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#10b981" : "#f87171" }} />
    {active ? "Actif" : "Inactif"}
  </span>
);

// ── Mini bar chart inline ──────────────────────────────────────
const MiniBar = ({ value, max, color = "#3b82f6" }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════

export default function AdminPage({ setPage }) {

  const [tab,         setTab]         = useState("thresholds"); // "thresholds" | "consumption"
  const [thresholds,  setThresholds]  = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [editId,      setEditId]      = useState(null);
  const [editForm,    setEditForm]    = useState({});
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [toast,       setToast]       = useState(null);

  // ── Barres de recherche ───────────────────────────────────
  const [searchSeuils,      setSearchSeuils]      = useState(""); // filtre onglet seuils
  const [searchConsomption, setSearchConsomption] = useState(""); // filtre onglet consommation

  // ── Charger les données au montage ────────────────────────
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        apiFetch(`${API}/thresholds`).then(r => r.json()),
        apiFetch(`${API}/analytics/summary`).then(r => r.json()),
      ]);
      setThresholds(Array.isArray(t) ? t : []);
      setSummary(s);
    } catch { showToast("Erreur chargement données", "error"); }
    setLoading(false);
  };

  const loadConsumption = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo)   params.set("date_to",   dateTo);
      const data = await apiFetch(`${API}/analytics/user-consumption?${params}`).then(r => r.json());
      setConsumption(Array.isArray(data) ? data : []);
    } catch { showToast("Erreur chargement consommation", "error"); }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === "consumption") loadConsumption();
  }, [tab]);

  // ── Toast notification ────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Ouvrir l'éditeur ──────────────────────────────────────
  const openEdit = (t) => {
    setEditId(t.id);
    setEditForm({
      max_amount_tnd        : t.max_amount_tnd,
      auto_approve_below_tnd: t.auto_approve_below_tnd,
    });
  };

  // ── Sauvegarder les modifications ─────────────────────────
  const saveThreshold = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/thresholds/${editId}`, {
        method : "PUT",
        body   : JSON.stringify(editForm),
      });
      if (res.ok) {
        showToast("Seuil mis à jour ✓");
        setEditId(null);
        loadAll();
      } else {
        showToast("Erreur sauvegarde", "error");
      }
    } catch { showToast("Erreur réseau", "error"); }
    setSaving(false);
  };

  // ── Activer / Désactiver ──────────────────────────────────
  const toggleStatus = async (id) => {
    try {
      const res = await apiFetch(`${API}/thresholds/${id}/toggle-status`, { method: "PATCH" });
      if (res.ok) {
        showToast("Statut modifié ✓");
        loadAll();
      }
    } catch { showToast("Erreur réseau", "error"); }
  };

  // ── Couleur par rôle ──────────────────────────────────────
  const roleColor = (role) => {
    const map = {
      "Administrateur Système" : "#3b82f6",
      "Administrateur"         : "#8b5cf6",
      "Comptable"              : "#10b981",
      "stagiaire 1"            : "#f59e0b",
      "stagiaire 2"            : "#f59e0b",
      "Responsable Financière" : "#ec4899",
      "Directeur Générale"     : "#ef4444",
    };
    return map[role] || "#64748b";
  };

  const maxTnd = Math.max(...consumption.map(c => c.total_tnd), 1);

  // ── Filtrage en temps réel ────────────────────────────────
  // Seuils : filtre sur role_name
  const seuilsFiltres = thresholds.filter(t =>
    t.role_name.toLowerCase().includes(searchSeuils.toLowerCase())
  );
  // Consommation : filtre sur username OU role
  const consomFiltres = consumption.filter(u =>
    u.username.toLowerCase().includes(searchConsomption.toLowerCase()) ||
    u.role.toLowerCase().includes(searchConsomption.toLowerCase())
  );

  // ── Style input recherche ─────────────────────────────────
  const searchInput = {
    width: "100%", padding: "9px 14px 9px 38px",
    borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)", color: "#e8f0ff",
    fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  // ── Style commun card ─────────────────────────────────────
  const card = {
    background   : "rgba(255,255,255,0.03)",
    border       : "1px solid rgba(255,255,255,0.07)",
    borderRadius : 16,
    boxShadow    : "0 8px 40px rgba(0,0,0,0.4)",
  };

  return (
    <div style={{ minHeight: "100vh", padding: "80px 28px 48px", position: "relative", zIndex: 1 }}>

      {/* ── Toast ────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 999,
          padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 500,
          background: toast.type === "error" ? "rgba(248,113,113,0.15)" : "rgba(16,185,129,0.15)",
          border: `1px solid ${toast.type === "error" ? "rgba(248,113,113,0.4)" : "rgba(16,185,129,0.4)"}`,
          color: toast.type === "error" ? "#f87171" : "#10b981",
          animation: "fade-in 0.3s ease",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── En-tête ──────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Administration
          </p>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: "#e8f0ff", marginBottom: 6, letterSpacing: "-0.3px" }}>
            Admin <span style={{ color: "#3b82f6" }}>Dashboard</span>
          </h1>
          <p style={{ color: "#5a6e99", fontSize: 14 }}>Gestion des seuils, suivi des consommations et seuils financiers.</p>
        </div>

        {/* ── KPI Cards ─────────────────────────────────── */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 32 }}>
            {[
              { label: "Total dépenses",  value: summary.total_receipts, color: "#3b82f6" },
              { label: "Montant total",   value: `${summary.total_tnd.toFixed(0)} TND`, color: "#10b981" },
              { label: "Approuvées",      value: summary.approved,  color: "#10b981" },
              { label: "En attente",      value: summary.pending,   color: "#f59e0b" },
              { label: "Rejetées",        value: summary.rejected,  color: "#f87171" },
              { label: "Utilisateurs",    value: summary.total_users, color: "#8b5cf6" },
            ].map((k, i) => (
              <div key={i} style={{ ...card, padding: "18px 20px" }}>
                <p style={{ fontSize: 11, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{k.label}</p>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Onglets ───────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[
            { key: "thresholds",  label: "Gestion des seuils"   },
            { key: "consumption", label: "Consommation"          },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding     : "9px 20px",
                borderRadius: 10,
                border      : `1px solid ${tab === t.key ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.07)"}`,
                background  : tab === t.key ? "rgba(37,99,235,0.12)" : "transparent",
                color       : tab === t.key ? "#60a5fa" : "#5a6e99",
                fontSize    : 13,
                fontWeight  : 600,
                cursor      : "pointer",
                transition  : "all 0.2s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════
            ONGLET 1 : GESTION DES SEUILS
        ════════════════════════════════════════════════ */}
        {tab === "thresholds" && (
          <div style={{ ...card, overflow: "hidden" }}>

            {/* En-tête tableau */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "#e8f0ff" }}>
                Seuils de remboursement
              </p>
              <span style={{ fontSize: 12, color: "#5a6e99" }}>
                {seuilsFiltres.length} / {thresholds.length} rôle{thresholds.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* ── Barre de recherche seuils ──────────────── */}
            <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a6e99" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  value={searchSeuils}
                  onChange={e => setSearchSeuils(e.target.value)}
                  placeholder="Rechercher par rôle… (ex: Comptable)"
                  style={searchInput}
                />
                {searchSeuils && (
                  <button onClick={() => setSearchSeuils("")}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#5a6e99", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>
                    ×
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#5a6e99" }}>Chargement…</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {["Rôle", "Plafond max (TND)", "Auto-approbation (TND)", "Statut", "Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seuilsFiltres.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: "32px 20px", textAlign: "center", color: "#5a6e99", fontSize: 13 }}>
                        Aucun rôle trouvé pour « {searchSeuils} »
                      </td></tr>
                    )}
                    {seuilsFiltres.map((t, i) => (
                      <>
                        {/* Ligne normale */}
                        <tr
                          key={t.id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            background  : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                          }}
                        >
                          {/* Rôle — texte jaune */}
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#facc15" }}>
                              {t.role_name}
                            </span>
                          </td>

                          {/* Plafond max */}
                          <td style={{ padding: "14px 20px", fontSize: 14, color: "#e8f0ff" }}>
                            {t.max_amount_tnd.toFixed(3)} TND
                          </td>

                          {/* Auto-approbation */}
                          <td style={{ padding: "14px 20px", fontSize: 14, color: "#c0cfee" }}>
                            {t.auto_approve_below_tnd.toFixed(3)} TND
                          </td>

                          {/* Badge statut */}
                          <td style={{ padding: "14px 20px" }}>
                            <StatusBadge active={t.is_active} />
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ display: "flex", gap: 8 }}>

                              {/* Modifier */}
                              <button
                                onClick={() => openEdit(t)}
                                style={{
                                  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                                  background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)",
                                  color: "#60a5fa", cursor: "pointer",
                                }}
                              >
                                Modifier
                              </button>

                              {/* Toggle actif/inactif */}
                              <button
                                onClick={() => toggleStatus(t.id)}
                                style={{
                                  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                                  background: t.is_active ? "rgba(248,113,113,0.1)" : "rgba(16,185,129,0.1)",
                                  border: `1px solid ${t.is_active ? "rgba(248,113,113,0.3)" : "rgba(16,185,129,0.3)"}`,
                                  color: t.is_active ? "#f87171" : "#10b981",
                                  cursor: "pointer",
                                }}
                              >
                                {t.is_active ? "Désactiver" : "Activer"}
                              </button>

                            </div>
                          </td>
                        </tr>

                        {/* Ligne édition inline */}
                        {editId === t.id && (
                          <tr key={`edit-${t.id}`} style={{ background: "rgba(37,99,235,0.05)", borderBottom: "1px solid rgba(37,99,235,0.2)" }}>
                            <td colSpan={5} style={{ padding: "16px 20px" }}>
                              <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>

                                <div>
                                  <label style={{ display: "block", fontSize: 11, color: "#5a6e99", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Plafond max (TND)
                                  </label>
                                  <input
                                    type="number"
                                    value={editForm.max_amount_tnd}
                                    onChange={e => setEditForm(f => ({ ...f, max_amount_tnd: parseFloat(e.target.value) }))}
                                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(37,99,235,0.3)", background: "rgba(0,0,0,0.3)", color: "#e8f0ff", fontSize: 14, width: 160, outline: "none" }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: "block", fontSize: 11, color: "#5a6e99", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Auto-approbation (TND)
                                  </label>
                                  <input
                                    type="number"
                                    value={editForm.auto_approve_below_tnd}
                                    onChange={e => setEditForm(f => ({ ...f, auto_approve_below_tnd: parseFloat(e.target.value) }))}
                                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(37,99,235,0.3)", background: "rgba(0,0,0,0.3)", color: "#e8f0ff", fontSize: 14, width: 160, outline: "none" }}
                                  />
                                </div>

                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    onClick={saveThreshold}
                                    disabled={saving}
                                    style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#2563eb", border: "none", color: "white", cursor: "pointer", opacity: saving ? 0.7 : 1 }}
                                  >
                                    {saving ? "…" : "Enregistrer"}
                                  </button>
                                  <button
                                    onClick={() => setEditId(null)}
                                    style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#5a6e99", cursor: "pointer" }}
                                  >
                                    Annuler
                                  </button>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            ONGLET 2 : CONSOMMATION PAR UTILISATEUR
        ════════════════════════════════════════════════ */}
        {tab === "consumption" && (
          <div>

            {/* Filtres par date */}
            <div style={{ ...card, padding: "20px 24px", marginBottom: 24, display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#5a6e99", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Date début
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#e8f0ff", fontSize: 13, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#5a6e99", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Date fin
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", color: "#e8f0ff", fontSize: 13, outline: "none" }}
                />
              </div>
              <button
                onClick={loadConsumption}
                style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#2563eb", border: "none", color: "white", cursor: "pointer" }}
              >
                Filtrer
              </button>
            </div>

            {/* Cards par utilisateur */}
            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#5a6e99" }}>Chargement…</div>
            ) : consumption.length === 0 ? (
              <div style={{ ...card, padding: 48, textAlign: "center", color: "#5a6e99" }}>
                Aucune donnée de consommation disponible.
              </div>
            ) : (
              <>
                {/* ── Barre de recherche consommation ──────── */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ position: "relative" }}>
                    <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a6e99" strokeWidth="2" strokeLinecap="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      value={searchConsomption}
                      onChange={e => setSearchConsomption(e.target.value)}
                      placeholder="Rechercher par nom ou rôle… (ex: Wiem, Comptable)"
                      style={searchInput}
                    />
                    {searchConsomption && (
                      <button onClick={() => setSearchConsomption("")}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#5a6e99", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>
                        ×
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: "#5a6e99", marginTop: 6 }}>
                    {consomFiltres.length} utilisateur{consomFiltres.length > 1 ? "s" : ""} affiché{consomFiltres.length > 1 ? "s" : ""}
                    {searchConsomption && ` pour « ${searchConsomption} »`}
                  </p>
                </div>

                {consomFiltres.length === 0 ? (
                  <div style={{ ...card, padding: 48, textAlign: "center", color: "#5a6e99" }}>
                    Aucun utilisateur trouvé pour « {searchConsomption} »
                  </div>
                ) : (
                <>
                {/* Grille de cartes */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16, marginBottom: 28 }}>
                  {consomFiltres.map((u, i) => (
                    <div key={u.user_id} style={{ ...card, padding: "20px 22px" }}>

                      {/* Avatar + infos */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${roleColor(u.role)}22`, border: `1px solid ${roleColor(u.role)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: roleColor(u.role), flexShrink: 0 }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#e8f0ff", marginBottom: 2 }}>{u.username}</p>
                          <p style={{ fontSize: 11, color: roleColor(u.role), fontWeight: 500 }}>{u.role}</p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                        {[
                          { label: "Soumises",  value: u.receipt_count, color: "#e8f0ff" },
                          { label: "Approuvées",value: u.approved_count, color: "#10b981" },
                          { label: "En attente",value: u.pending_count,  color: "#f59e0b" },
                        ].map(s => (
                          <div key={s.label} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</p>
                            <p style={{ fontSize: 10, color: "#5a6e99" }}>{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Total TND + barre */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#5a6e99" }}>Total dépensé</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6" }}>
                            {u.total_tnd.toFixed(3)} TND
                          </span>
                        </div>
                        <MiniBar value={u.total_tnd} max={maxTnd} color={roleColor(u.role)} />
                      </div>

                    </div>
                  ))}
                </div>

                {/* Tableau récapitulatif */}
                <div style={{ ...card, overflow: "hidden" }}>
                  <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#e8f0ff" }}>
                      Tableau récapitulatif
                    </p>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {["Utilisateur", "Rôle", "Dépenses", "Approuvées", "En attente", "Rejetées", "Total (TND)"].map(h => (
                          <th key={h} style={{ padding: "10px 18px", textAlign: "left", fontSize: 11, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {consomFiltres.map((u, i) => (
                        <tr key={u.user_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                          <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 600, color: "#e8f0ff" }}>{u.username}</td>
                          {/* Rôle en jaune */}
                          <td style={{ padding: "12px 18px", fontSize: 12, color: "#facc15", fontWeight: 600 }}>{u.role}</td>
                          <td style={{ padding: "12px 18px", fontSize: 13, color: "#c0cfee" }}>{u.receipt_count}</td>
                          <td style={{ padding: "12px 18px", fontSize: 13, color: "#10b981" }}>{u.approved_count}</td>
                          <td style={{ padding: "12px 18px", fontSize: 13, color: "#f59e0b" }}>{u.pending_count}</td>
                          <td style={{ padding: "12px 18px", fontSize: 13, color: "#f87171" }}>{u.rejected_count}</td>
                          <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 700, color: "#3b82f6", fontFamily: "'Syne',sans-serif" }}>
                            {u.total_tnd.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}