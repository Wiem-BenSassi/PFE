// ─── src/components/BudgetAlertBanner.jsx ────────────────────────────────────
// Bannière d'alerte budget — affichage dynamique selon le pourcentage.
// Composant purement présentationnel : reçoit pct, affiche l'alerte correcte.
//
// USAGE dans UploadPage, HomePage ou tout autre composant :
//
//   import BudgetAlertBanner from "../components/BudgetAlertBanner";
//
//   // Affiche rien si < 80%, jaune à 80%, orange à 90%, rouge à 95%+
//   <BudgetAlertBanner pct={budgetStatus?.pct_utilise ?? 0} />
//
//   // Ne montrer qu'à partir de 90% (optionnel)
//   <BudgetAlertBanner pct={pct} showFrom={90} />
//
//   // Avec bouton de fermeture (optionnel)
//   <BudgetAlertBanner pct={pct} dismissible />

import { useState, useEffect } from "react";
import { useBudgetAlert }      from "../hooks/useBudgetAlert";

// ── Icône SVG triangle d'alerte / check ──────────────────────────────────────
const AlertIcon = ({ path, color, size = 18 }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

// ── Barre de progression colorée ─────────────────────────────────────────────
const ProgressBar = ({ pct, color }) => {
  const clamped = Math.min(pct, 100);
  const barColor =
    pct >= 95 ? "#ef4444"
    : pct >= 90 ? "#ea580c"
    : pct >= 80 ? "#f59e0b"
    : "#10b981";

  return (
    <div style={{
      height: 6, borderRadius: 3,
      background: "rgba(255,255,255,0.15)",
      overflow: "hidden", marginTop: 10,
    }}>
      <div style={{
        height: "100%", borderRadius: 3,
        width: `${clamped}%`,
        background: barColor,
        transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
      }} />
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────────
export default function BudgetAlertBanner({
  pct        = 0,
  showFrom   = 80,     // seuil minimal d'affichage (80 par défaut)
  dismissible = false, // affiche un bouton ✕ pour fermer
  compact    = false,  // version courte (une seule ligne)
  style      = {},
}) {
  const { level, cfg, isAlert } = useBudgetAlert(pct);
  const [dismissed, setDismissed] = useState(false);

  // Réinitialise la fermeture si le niveau change (nouvelle alerte plus grave)
  useEffect(() => { setDismissed(false); }, [level]);

  // Ne rien afficher si en dessous du seuil d'affichage ou fermé
  if (pct < showFrom || dismissed || !isAlert) return null;

  // ── Version compacte (une ligne) ──────────────────────────────────────────
  if (compact) return (
    <div
      role="alert"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderRadius: 10,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        animation: "fade-in 0.3s ease",
        ...style,
      }}
    >
      <AlertIcon path={cfg.iconPath} color={cfg.iconColor} size={15} />
      <span style={{ fontSize: 13, fontWeight: 500, color: cfg.color, flex: 1 }}>
        {cfg.title}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 700, color: cfg.color,
        background: "rgba(255,255,255,0.15)", padding: "2px 8px",
        borderRadius: 6,
      }}>
        {pct.toFixed(1)}%
      </span>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: cfg.color, opacity: 0.6, padding: 4,
            display: "flex", alignItems: "center",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );

  // ── Version complète (avec description et barre) ──────────────────────────
  return (
    <div
      role="alert"
      style={{
        padding: "14px 18px", borderRadius: 12,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        animation: "fade-in 0.3s ease",
        // Effet de pulsation pour les niveaux critiques
        ...(cfg.pulse ? {
          boxShadow: `0 0 0 3px ${cfg.border}`,
          animation: "fade-in 0.3s ease, pulse-border 2s ease-in-out infinite",
        } : {}),
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Icône */}
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: "rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AlertIcon path={cfg.iconPath} color={cfg.iconColor} size={17} />
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center",
                        justifyContent: "space-between", marginBottom: 3 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: cfg.color, margin: 0 }}>
              {cfg.title}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Badge pourcentage */}
              <span style={{
                fontSize: 12, fontWeight: 700, color: cfg.color,
                background: "rgba(255,255,255,0.18)", padding: "2px 10px",
                borderRadius: 20, flexShrink: 0,
              }}>
                {pct.toFixed(1)}%
              </span>
              {/* Badge niveau */}
              <span style={{
                fontSize: 10, fontWeight: 600, color: cfg.color,
                letterSpacing: "0.06em", textTransform: "uppercase",
                opacity: 0.75,
              }}>
                {cfg.label}
              </span>
              {/* Bouton fermeture */}
              {dismissible && (
                <button
                  onClick={() => setDismissed(true)}
                  aria-label="Fermer l'alerte"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: cfg.color, opacity: 0.5, padding: 4,
                    display: "flex", alignItems: "center",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          <p style={{ fontSize: 12, color: cfg.color, opacity: 0.8,
                      margin: 0, fontWeight: 300, lineHeight: 1.5 }}>
            {cfg.description}
          </p>
          {/* Barre de progression dans la bannière */}
          <ProgressBar pct={pct} color={cfg.color} />
        </div>
      </div>
    </div>
  );
}