// ─── src/hooks/useBudget.js ───────────────────────────────────────────────────
// Hook React : vérifie le budget avant un upload et bloque si nécessaire.
//
// Usage dans UploadPage ou InvoiceVerification :
//
//   const { budgetStatus, checkBudget, isBudgetBlocked } = useBudget();
//
//   // Avant de confirmer un upload :
//   const result = await checkBudget(montant);
//   if (!result.allowed) {
//     setError(result.message);
//     return;
//   }

import { useState, useEffect, useCallback } from "react";

const BASE_URL = "http://127.0.0.1:8000";

/**
 * Hook : gestion du budget de l'utilisateur connecté.
 *
 * Retourne :
 *   budgetStatus   {object|null}  — données budget (seuil_max, total_depense, pct_utilise...)
 *   budgetLoading  {boolean}      — chargement en cours
 *   budgetError    {string}       — message d'erreur
 *   isBudgetBlocked {boolean}    — TRUE si l'upload doit être bloqué (plafond dépassé)
 *   checkBudget    {function}    — vérifie un montant AVANT upload
 *   refreshBudget  {function}    — recharge les données budget
 */
export function useBudget() {
  const [budgetStatus,  setBudgetStatus]  = useState(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError,   setBudgetError]   = useState("");

  const username = localStorage.getItem("username") || "";

  // ── Charger le budget de l'utilisateur connecté ───────────────────────────
  const refreshBudget = useCallback(async () => {
    if (!username) return;
    setBudgetLoading(true);
    setBudgetError("");
    try {
      const res = await fetch(`${BASE_URL}/budget/me`, {
        headers: { "X-Username": username },
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setBudgetStatus(data);
    } catch (err) {
      setBudgetError(err.message);
    } finally {
      setBudgetLoading(false);
    }
  }, [username]);

  useEffect(() => { refreshBudget(); }, [refreshBudget]);

  // ── Vérifier un montant avant upload ──────────────────────────────────────
  // Retourne { allowed, message, alert_level, new_pct, ... }
  const checkBudget = useCallback(async (amountTnd, documentType = "expense") => {
    if (!amountTnd || amountTnd <= 0) {
      return { allowed: true, alert_level: "ok", message: "" };
    }

    try {
      const res = await fetch(`${BASE_URL}/budget/check`, {
        method : "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Username"  : username,
        },
        body: JSON.stringify({ amount_tnd: amountTnd, document_type: documentType }),
      });

      if (!res.ok) {
        // En cas d'erreur backend → on ne bloque pas (fail-open)
        console.warn("Budget check failed, allowing upload");
        return { allowed: true, alert_level: "ok", message: "" };
      }

      const result = await res.json();

      // Recharge le budget après le check (les chiffres peuvent avoir changé)
      refreshBudget();

      return result;

    } catch (err) {
      // Erreur réseau → on ne bloque pas l'upload
      console.warn("Budget check network error:", err.message);
      return { allowed: true, alert_level: "ok", message: "" };
    }
  }, [username, refreshBudget]);

  return {
    budgetStatus,
    budgetLoading,
    budgetError,
    isBudgetBlocked : budgetStatus?.is_blocked ?? false,
    checkBudget,
    refreshBudget,
  };
}