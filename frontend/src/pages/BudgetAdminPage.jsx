// ─── src/pages/BudgetAdminPage.jsx ───────────────────────────────────────────
// Page d'administration des seuils financiers par utilisateur.
// Accessible depuis AdminPage ou SystemAdminPage.
//
// Fonctionnalités :
//   • Tableau de tous les utilisateurs avec leur budget
//   • Barre de progression par utilisateur
//   • Modification du seuil en ligne (inline edit)
//   • Historique des alertes avec acquittement
//   • Filtres : rôle, statut d'alerte

import { useState, useEffect, useCallback } from "react";

const BASE_URL = "http://127.0.0.1:8000";
const fmt      = (n) => Number(n).toLocaleString("fr-TN", { minimumFractionDigits: 3 }) + " TND";

// ── Couleurs d'alerte ─────────────────────────────────────────────────────────
const alertStyle = (status) => ({
  ok          : { color: "#10b981", bg: "rgba(16,185,129,0.1)",  label: "OK"          },
  warning_80  : { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "80% atteint" },
  warning_90  : { color: "#f97316", bg: "rgba(249,115,22,0.1)",  label: "90% atteint" },
  exceeded    : { color: "#f87171", bg: "rgba(248,113,113,0.1)", label: "Dépassé"     },
})[status] || { color: "#5a6e99", bg: "rgba(90,110,153,0.1)", label: status };

// ── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={{ animation: "spin-ring 0.8s linear infinite" }}>
    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5"/>
    <path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

// ══════════════════════════════════════════════════════════════════════════════
// MODAL : édition du seuil d'un utilisateur
// ══════════════════════════════════════════════════════════════════════════════
function EditBudgetModal({ user, onClose, onSaved }) {
  const [seuil,   setSeuil]   = useState(user.seuil_max?.toString() || "100000");
  const [notes,   setNotes]   = useState(user.budget_notes || "");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const handleSave = async () => {
    const val = parseFloat(seuil);
    if (!val || val <= 0) { setError("Le seuil doit être supérieur à 0."); return; }

    setSaving(true);
    setError("");
    try {
      const method = user.budget_id ? "PATCH" : "POST";
      const res = await fetch(`${BASE_URL}/budget/users/${user.user_id}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Username"  : localStorage.getItem("username") || "",
        },
        body: JSON.stringify({ seuil_max: val, period_type: "monthly", notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div style={{ background: "linear-gradient(145deg,#0d1627,#0a1120)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 20, padding: "32px 36px", maxWidth: 440, width: "90%", animation: "slide-up 0.3s ease" }} onClick={e => e.stopPropagation()}>

        <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "#e8f0ff", marginBottom: 4 }}>
          Modifier le seuil
        </p>
        <p style={{ fontSize: 13, color: "#5a6e99", marginBottom: 24 }}>
          {user.username} · <span style={{ color: "#3b82f6" }}>{user.role}</span>
        </p>

        {/* Champ seuil */}
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Plafond mensuel (TND)
        </label>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input
            type="number"
            min="0"
            step="1000"
            value={seuil}
            onChange={e => setSeuil(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.35)", borderRadius: 12, outline: "none", color: "#e8f0ff", fontSize: 16, fontFamily: "'Syne',sans-serif", fontWeight: 600, boxSizing: "border-box" }}
          />
        </div>

        {/* Aperçu rapide */}
        {seuil && !isNaN(parseFloat(seuil)) && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.2)", marginBottom: 16, fontSize: 12, color: "#93c5fd" }}>
            Plafond : <strong>{fmt(parseFloat(seuil))}</strong>
            {user.total_depense > 0 && (
              <> · Déjà dépensé : <strong>{fmt(user.total_depense)}</strong>
               · Nouveau solde : <strong style={{ color: parseFloat(seuil) > user.total_depense ? "#10b981" : "#f87171" }}>
                  {fmt(Math.max(0, parseFloat(seuil) - user.total_depense))}
                </strong>
              </>
            )}
          </div>
        )}

        {/* Notes */}
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5a6e99", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Note (optionnel)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Raison de ce seuil personnalisé…"
          rows={2}
          style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, outline: "none", color: "#e8f0ff", fontSize: 13, fontFamily: "'DM Sans',sans-serif", resize: "none", boxSizing: "border-box", marginBottom: 16 }}
        />

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose} style={{ padding: "10px 22px", fontSize: 14 }}>Annuler</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: "10px 26px", fontSize: 14, display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.7 : 1 }}>
            {saving ? <><Spinner /> Enregistrement…</> : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function BudgetAdminPage() {

  const [budgets,   setBudgets]   = useState([]);
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [editUser,  setEditUser]  = useState(null);    // user en cours d'édition
  const [tab,       setTab]       = useState("budgets"); // 'budgets' | 'alerts'
  const [filterRole, setFilterRole] = useState("all");

  const username = localStorage.getItem("username") || "";

  // ── Chargement ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bRes, aRes] = await Promise.all([
        fetch(`${BASE_URL}/budget/users`,        { headers: { "X-Username": username } }),
        fetch(`${BASE_URL}/budget/alerts`,       { headers: { "X-Username": username } }),
      ]);

      if (bRes.ok) {
        const d = await bRes.json();
        setBudgets(d.budgets || []);
      }
      if (aRes.ok) {
        const d = await aRes.json();
        setAlerts(d);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Acquittement d'alerte ──────────────────────────────────────────────────
  const acknowledgeAlert = async (alertId) => {
    await fetch(`${BASE_URL}/budget/alerts/${alertId}/ack`, {
      method : "POST",
      headers: { "X-Username": username },
    });
    fetchAll();
  };

  // ── Filtrage ───────────────────────────────────────────────────────────────
  const roles       = ["all", ...new Set(budgets.map(b => b.role))];
  const filtered    = filterRole === "all" ? budgets : budgets.filter(b => b.role === filterRole);
  const unreadAlerts = alerts.filter(a => !a.acknowledged).length;

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", padding: "80px 28px 60px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ── En-tête ────────────────────────────────────────────────────── */}
        <div className="fe1" style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Administration
          </p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: "#e8f0ff", marginBottom: 6, letterSpacing: "-0.3px" }}>
            Seuils <span style={{ color: "#3b82f6" }}>financiers</span>
          </h1>
          <p style={{ color: "#5a6e99", fontSize: 14, fontWeight: 300 }}>
            Gérez les plafonds de dépenses par utilisateur et suivez les alertes.
          </p>
        </div>

        {/* ── KPI résumé ─────────────────────────────────────────────────── */}
        <div className="fe2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Utilisateurs",       value: budgets.length,                             color: "#3b82f6" },
            { label: "Dépassements",       value: budgets.filter(b => b.alert_status === "exceeded").length,    color: "#f87171" },
            { label: "Alertes 80%+",       value: budgets.filter(b => ["warning_80","warning_90"].includes(b.alert_status)).length, color: "#f59e0b" },
            { label: "Alertes non lues",   value: unreadAlerts,                               color: "#f97316" },
          ].map((k, i) => (
            <div key={i} className="surface-card" style={{ padding: "16px 20px" }}>
              <p style={{ fontSize: 10, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Onglets ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {[
            { key: "budgets", label: "Budgets utilisateurs" },
            { key: "alerts",  label: `Alertes${unreadAlerts > 0 ? ` (${unreadAlerts})` : ""}` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={tab === t.key ? "btn-primary" : "btn-ghost"}
              style={{ padding: "9px 20px", fontSize: 13, borderRadius: 10 }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ONGLET BUDGETS
           ══════════════════════════════════════════════════════════════════ */}
        {tab === "budgets" && (
          <>
            {/* Filtre par rôle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {roles.map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRole(r)}
                  style={{
                    padding: "5px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "none",
                    background: filterRole === r ? "rgba(37,99,235,0.2)"  : "rgba(255,255,255,0.04)",
                    color     : filterRole === r ? "#60a5fa"              : "#5a6e99",
                    border    : filterRole === r ? "1px solid rgba(37,99,235,0.4)" : "1px solid rgba(255,255,255,0.07)",
                    transition: "all 0.2s",
                  }}
                >
                  {r === "all" ? "Tous les rôles" : r}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "#5a6e99" }}>
                <Spinner size={32} />
                <p style={{ marginTop: 16 }}>Chargement…</p>
              </div>
            ) : (
              <div className="surface-card" style={{ overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["Utilisateur", "Rôle", "Plafond", "Dépensé", "Progression", "Solde", "Statut", "Action"].map(h => (
                        <th key={h} style={{ padding: "14px 16px", fontSize: 10, fontWeight: 600, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b, i) => {
                      const cfg = alertStyle(b.alert_status);
                      const pct = Math.min(b.pct_utilise, 100);
                      return (
                        <tr key={b.user_id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          {/* Utilisateur */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", fontFamily: "'Syne',sans-serif", flexShrink: 0 }}>
                                {(b.username || "?")[0].toUpperCase()}
                              </div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 500, color: "#e8f0ff" }}>{b.username}</p>
                                <p style={{ fontSize: 10, color: "#5a6e99" }}>{b.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Rôle */}
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(37,99,235,0.1)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.2)" }}>
                              {b.role}
                            </span>
                          </td>

                          {/* Plafond */}
                          <td style={{ padding: "14px 16px" }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#e8f0ff" }}>{fmt(b.seuil_max)}</p>
                            <p style={{ fontSize: 10, color: "#3a4d72" }}>
                              {b.seuil_source === "user" ? "📌 Personnalisé" : "🏷 Par rôle"}
                            </p>
                          </td>

                          {/* Dépensé */}
                          <td style={{ padding: "14px 16px" }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{fmt(b.total_depense)}</p>
                          </td>

                          {/* Barre de progression */}
                          <td style={{ padding: "14px 16px", minWidth: 120 }}>
                            <div style={{ marginBottom: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{pct.toFixed(1)}%</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 3,
                                width  : `${pct}%`,
                                background: pct >= 100 ? "#f87171" : pct >= 90 ? "#f97316" : pct >= 80 ? "#f59e0b" : "#10b981",
                                transition: "width 0.8s ease",
                              }} />
                            </div>
                          </td>

                          {/* Solde restant */}
                          <td style={{ padding: "14px 16px" }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: b.is_blocked ? "#f87171" : "#10b981" }}>
                              {b.is_blocked ? "Bloqué" : fmt(b.solde_restant)}
                            </p>
                          </td>

                          {/* Badge statut */}
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44` }}>
                              {cfg.label}
                            </span>
                          </td>

                          {/* Action */}
                          <td style={{ padding: "14px 16px" }}>
                            <button
                              onClick={() => setEditUser(b)}
                              className="btn-ghost"
                              style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Modifier
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#3a4d72" }}>
                    Aucun utilisateur pour ce filtre.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ONGLET ALERTES
           ══════════════════════════════════════════════════════════════════ */}
        {tab === "alerts" && (
          <div className="surface-card" style={{ padding: "24px 28px" }}>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#e8f0ff", marginBottom: 20 }}>
              Historique des alertes de dépassement
            </p>

            {alerts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#3a4d72" }}>
                ✓ Aucune alerte enregistrée.
              </div>
            ) : (
              alerts.map(a => {
                const cfg = alertStyle(a.alert_type);
                return (
                  <div key={a.alert_id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px", borderRadius: 10, marginBottom: 8,
                    background: a.acknowledged ? "rgba(255,255,255,0.02)" : cfg.bg,
                    border: `1px solid ${a.acknowledged ? "rgba(255,255,255,0.06)" : cfg.color + "44"}`,
                    opacity: a.acknowledged ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: 18 }}>
                        {a.alert_type === "exceeded" ? "⛔" : "⚠"}
                      </span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: a.acknowledged ? "#5a6e99" : cfg.color }}>
                          {a.username} — {cfg.label}
                        </p>
                        <p style={{ fontSize: 11, color: "#5a6e99" }}>
                          {a.pct_used?.toFixed(1)}% utilisé · {fmt(a.amount)} / {fmt(a.seuil)} · {new Date(a.created_at).toLocaleDateString("fr-TN")}
                        </p>
                      </div>
                    </div>

                    {!a.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(a.alert_id)}
                        className="btn-ghost"
                        style={{ padding: "5px 14px", fontSize: 11, flexShrink: 0 }}
                      >
                        Acquitter
                      </button>
                    )}
                    {a.acknowledged && (
                      <span style={{ fontSize: 11, color: "#3a4d72" }}>✓ Lu</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* ── Modal d'édition ─────────────────────────────────────────────── */}
      {editUser && (
        <EditBudgetModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}