// ─── src/components/BudgetWidget.jsx ─────────────────────────────────────────
// Composant réutilisable : affiche le seuil, le total dépensé, le solde restant
// et une barre de progression avec alertes visuelles.
//
// Usage :
//   <BudgetWidget />                   → budget de l'utilisateur connecté
//   <BudgetWidget userId={5} />        → budget d'un utilisateur précis (admin)
//   <BudgetWidget compact />           → version compacte pour la sidebar/navbar

import { useState, useEffect, useCallback } from "react";

const BASE_URL = "http://127.0.0.1:8000";

// ── Helper : formatage des montants ──────────────────────────────────────────
const fmt = (n) =>
  Number(n).toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " TND";

// ── Couleurs selon le niveau d'alerte ────────────────────────────────────────
const ALERT_CONFIG = {
  ok          : { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)", icon: "✓",  label: "Dans les limites" },
  warning_80  : { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.3)",  icon: "⚠",  label: "80% atteint" },
  warning_90  : { color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.3)",  icon: "⚠",  label: "90% atteint" },
  exceeded    : { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.3)", icon: "⛔", label: "Plafond dépassé" },
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Props :
 *   userId  {number}  — si fourni → budget de cet utilisateur (vue admin)
 *                       sinon → budget de l'utilisateur connecté (/budget/me)
 *   compact {boolean} — version condensée (sidebar, header)
 *   onBlock {function(isBlocked)} — callback quand l'état de blocage change
 */
export default function BudgetWidget({ userId, compact = false, onBlock }) {

  const [budget,  setBudget]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // ── Chargement des données budget ─────────────────────────────────────────
  const fetchBudget = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = userId
        ? `${BASE_URL}/budget/users/${userId}`
        : `${BASE_URL}/budget/me`;

      const res = await fetch(url, {
        headers: { "X-Username": localStorage.getItem("username") || "" },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur ${res.status}`);
      }

      const data = await res.json();
      setBudget(data);

      // Notifie le parent si le budget est bloqué
      if (onBlock) onBlock(data.is_blocked);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, onBlock]);

  useEffect(() => { fetchBudget(); }, [fetchBudget]);

  // ── Chargement ────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: compact ? "12px 16px" : "20px 24px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="14" height="14" viewBox="0 0 20 20" style={{ animation: "spin-ring 0.8s linear infinite", flexShrink: 0 }}>
          <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5"/>
          <path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 13, color: "#5a6e99" }}>Chargement du budget…</span>
      </div>
    </div>
  );

  // ── Erreur ────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", fontSize: 12, color: "#f87171" }}>
      ⚠ {error}
    </div>
  );

  if (!budget) return null;

  const cfg = ALERT_CONFIG[budget.alert_status] || ALERT_CONFIG.ok;
  const pct = Math.min(budget.pct_utilise, 100);

  // ══════════════════════════════════════════════════════════════════════════
  // VERSION COMPACTE (sidebar / header)
  // ══════════════════════════════════════════════════════════════════════════
  if (compact) return (
    <div style={{
      padding: "12px 16px", borderRadius: 12,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      transition: "all 0.3s",
    }}>
      {/* Ligne titre + badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {cfg.icon} Budget mensuel
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>
          {pct.toFixed(1)}%
        </span>
      </div>

      {/* Barre de progression */}
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 8 }}>
        <div style={{
          height: "100%", borderRadius: 3,
          background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
          width: `${pct}%`,
          transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
        }} />
      </div>

      {/* Solde restant */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#5a6e99" }}>Restant</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: budget.is_blocked ? "#f87171" : "#e8f0ff" }}>
          {fmt(budget.solde_restant)}
        </span>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VERSION COMPLÈTE
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="surface-card" style={{ padding: "24px 28px" }}>

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, color: "#5a6e99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            Seuil financier mensuel
          </p>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: "#e8f0ff" }}>
            {budget.username}
          </p>
          <p style={{ fontSize: 11, color: "#5a6e99", marginTop: 2 }}>{budget.role}</p>
        </div>

        {/* Badge alerte */}
        <div style={{
          padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
          display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        }}>
          {cfg.icon} {cfg.label}
        </div>
      </div>

      {/* ── Barre de progression principale ──────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#5a6e99" }}>Utilisation du plafond</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color, fontFamily: "'Syne',sans-serif" }}>
            {pct.toFixed(1)}%
          </span>
        </div>

        {/* Rail de la barre */}
        <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.06)", overflow: "hidden", position: "relative" }}>
          {/* Marqueur 80% */}
          <div style={{ position: "absolute", left: "80%", top: 0, bottom: 0, width: 1, background: "rgba(245,158,11,0.4)", zIndex: 1 }} />
          {/* Marqueur 90% */}
          <div style={{ position: "absolute", left: "90%", top: 0, bottom: 0, width: 1, background: "rgba(249,115,22,0.4)", zIndex: 1 }} />

          {/* Barre de progression */}
          <div style={{
            height: "100%", borderRadius: 5,
            background: pct >= 100
              ? "linear-gradient(90deg,#f87171,#ef4444)"
              : pct >= 90
                ? "linear-gradient(90deg,#f97316,#ef4444)"
                : pct >= 80
                  ? "linear-gradient(90deg,#f59e0b,#f97316)"
                  : "linear-gradient(90deg,#10b981,#3b82f6)",
            width: `${pct}%`,
            transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
          }} />
        </div>

        {/* Légende des marqueurs */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 9, color: "#3a4d72" }}>0</span>
          <span style={{ fontSize: 9, color: "rgba(245,158,11,0.6)" }}>80%</span>
          <span style={{ fontSize: 9, color: "rgba(249,115,22,0.6)" }}>90%</span>
          <span style={{ fontSize: 9, color: "#3a4d72" }}>100%</span>
        </div>
      </div>

      {/* ── 3 métriques principales ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>

        {/* Plafond max */}
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.18)" }}>
          <p style={{ fontSize: 10, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Plafond</p>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "#e8f0ff" }}>
            {fmt(budget.seuil_max)}
          </p>
          <p style={{ fontSize: 9, color: "#3a4d72", marginTop: 4 }}>
            {budget.seuil_source === "user" ? "Personnalisé" : "Par rôle"}
          </p>
        </div>

        {/* Total dépensé */}
        <div style={{ padding: "14px 16px", borderRadius: 12, background: `${cfg.bg}`, border: `1px solid ${cfg.border}` }}>
          <p style={{ fontSize: 10, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Dépensé</p>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: cfg.color }}>
            {fmt(budget.total_depense)}
          </p>
          <p style={{ fontSize: 9, color: "#3a4d72", marginTop: 4 }}>Ce mois-ci</p>
        </div>

        {/* Solde restant */}
        <div style={{
          padding: "14px 16px", borderRadius: 12,
          background: budget.is_blocked ? "rgba(248,113,113,0.08)" : "rgba(16,185,129,0.07)",
          border: `1px solid ${budget.is_blocked ? "rgba(248,113,113,0.25)" : "rgba(16,185,129,0.2)"}`,
        }}>
          <p style={{ fontSize: 10, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Restant</p>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: budget.is_blocked ? "#f87171" : "#10b981" }}>
            {budget.is_blocked ? "0.000 TND" : fmt(budget.solde_restant)}
          </p>
          <p style={{ fontSize: 9, color: "#3a4d72", marginTop: 4 }}>Disponible</p>
        </div>
      </div>

      {/* ── Détail des dépenses ────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 10, color: "#5a6e99", marginBottom: 4 }}>📋 Notes de frais</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#e8f0ff" }}>{fmt(budget.depenses_receipts)}</p>
        </div>
        <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 10, color: "#5a6e99", marginBottom: 4 }}>🏢 Factures fourn.</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#e8f0ff" }}>{fmt(budget.depenses_invoices)}</p>
        </div>
      </div>

      {/* ── Message d'alerte si seuil franchi ─────────────────────────────── */}
      {budget.alert_status !== "ok" && (
        <div style={{
          padding: "12px 16px", borderRadius: 10,
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          display: "flex", alignItems: "flex-start", gap: 10,
          animation: "fade-in 0.3s ease",
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{cfg.icon}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: cfg.color, marginBottom: 2 }}>
              {budget.alert_status === "exceeded"
                ? "Plafond dépassé — nouveaux uploads bloqués"
                : `${pct.toFixed(1)}% du plafond atteint`}
            </p>
            <p style={{ fontSize: 12, color: cfg.color, opacity: 0.75, fontWeight: 300 }}>
              {budget.alert_status === "exceeded"
                ? "Contactez votre administrateur pour ajuster votre seuil."
                : "Vous approchez de votre limite mensuelle."}
            </p>
          </div>
        </div>
      )}

      {/* ── Bouton rafraîchir ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button
          onClick={fetchBudget}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#5a6e99", fontSize: 11, display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, transition: "color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#e8f0ff"}
          onMouseLeave={e => e.currentTarget.style.color = "#5a6e99"}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-3.45"/>
          </svg>
          Actualiser
        </button>
      </div>
    </div>
  );
}