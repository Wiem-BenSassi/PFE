// ─── src/hooks/useBudgetAlert.js ─────────────────────────────────────────────
// Hook utilitaire : logique d'alerte budget découplée de l'affichage.
// Retourne le niveau d'alerte, la config visuelle et les helpers.
// Importez ce hook dans n'importe quel composant qui doit réagir au budget.
//
// USAGE :
//   const { level, cfg, isAlert } = useBudgetAlert(pct);
//
//   level  → "ok" | "warning_80" | "warning_90" | "warning_95" | "exceeded"
//   cfg    → { color, bg, border, icon, label, title, description, pulse }
//   isAlert → true si level !== "ok"

// ── Table de configuration — TOUTE la logique visuelle ici ──────────────────
// Modifiez uniquement ce tableau pour changer les couleurs, icônes ou textes.
import { useMemo } from "react";
export const ALERT_CONFIG = {
  ok: {
    color      : "var(--color-text-success)",
    bg         : "var(--color-background-success)",
    border     : "var(--color-border-success)",
    iconPath   : "M5 13l4 4L19 7",           // checkmark SVG path
    iconColor  : "var(--color-text-success)",
    label      : "Dans les limites",
    title      : "Budget sous contrôle",
    description: "Votre consommation reste dans les limites définies.",
    pulse      : false,
    severity   : 0,
  },
  warning_80: {
    color      : "var(--color-text-warning)",
    bg         : "var(--color-background-warning)",
    border     : "var(--color-border-warning)",
    iconPath   : "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    iconColor  : "var(--color-text-warning)",
    label      : "80% atteint",
    title      : "Attention — seuil à 80%",
    description: "Vous avez consommé 80% de votre budget mensuel. Anticipez vos prochaines dépenses.",
    pulse      : false,
    severity   : 1,
  },
  warning_90: {
    color      : "#ea580c",  // orange — pas de variable CSS native pour l'orange
    bg         : "rgba(234,88,12,0.08)",
    border     : "rgba(234,88,12,0.28)",
    iconPath   : "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    iconColor  : "#ea580c",
    label      : "90% atteint",
    title      : "Alerte — seuil à 90%",
    description: "Votre budget approche de son maximum. Limitez les nouvelles notes de frais.",
    pulse      : false,
    severity   : 2,
  },
  warning_95: {
    color      : "var(--color-text-danger)",
    bg         : "var(--color-background-danger)",
    border     : "var(--color-border-danger)",
    iconPath   : "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    iconColor  : "var(--color-text-danger)",
    label      : "95% — Admin notifié",
    title      : "Critique — seuil à 95%",
    description: "L'administrateur a été notifié par email. L'upload reste autorisé.",
    pulse      : true,
    severity   : 3,
  },
  exceeded: {
    color      : "var(--color-text-danger)",
    bg         : "var(--color-background-danger)",
    border     : "var(--color-border-danger)",
    iconPath   : "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    iconColor  : "var(--color-text-danger)",
    label      : "Seuil dépassé",
    title      : "Dépassement de budget",
    description: "Le plafond mensuel est dépassé. L'administrateur a été alerté. L'upload reste actif.",
    pulse      : true,
    severity   : 4,
  },
};

// ── Fonction pure : calcul du niveau à partir d'un pourcentage ────────────────
// Réutilisable hors d'un composant React (tests unitaires, etc.)
export function computeAlertLevel(pct) {
  if (pct >= 100) return "exceeded";
  if (pct >= 95)  return "warning_95";
  if (pct >= 90)  return "warning_90";
  if (pct >= 80)  return "warning_80";
  return "ok";
}

// ── Hook React ────────────────────────────────────────────────────────────────


export function useBudgetAlert(pct = 0) {
  return useMemo(() => {
    const level   = computeAlertLevel(pct);
    const cfg     = ALERT_CONFIG[level];
    const isAlert = level !== "ok";

    return {
      level,
      cfg,
      isAlert,
      // Helpers booléens pour conditions rapides dans les composants
      isWarning : level === "warning_80" || level === "warning_90",
      isCritical: level === "warning_95" || level === "exceeded",
      isExceeded: level === "exceeded",
    };
  }, [pct]);
}