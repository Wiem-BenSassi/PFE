// ─── src/hooks/useBudget.js ───────────────────────────────────────────────────
// Hook React — gestion du budget notes de frais.
//
// MODIFICATIONS PAR RAPPORT À LA VERSION ORIGINALE :
//   1. checkBudget() → retourne toujours allowed: true (pas de blocage)
//   2. isBudgetBlocked → toujours false (supprimé fonctionnellement)
//   3. Nouveau champ isOverThreshold → true si pct ≥ 95% (pour afficher un warning)
//
// ⚠️  RÈGLE MÉTIER : le seuil s'applique UNIQUEMENT aux notes de frais.
//     Les factures fournisseur (supplier_invoice) ne sont JAMAIS bloquées.

import { useState, useEffect, useCallback } from "react";

import { API_BASE_URL } from "../config/api";

const BASE_URL = API_BASE_URL;

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
  //
  // MODIFIÉ : allowed est TOUJOURS true — l'upload n'est plus jamais bloqué.
  //   - Si pct ≥ 95% → alert_level = "warning_95" ou "exceeded"
  //   - Le composant appelant peut afficher un warning, mais pas bloquer.
  //
  // @param {number}  amountTnd     — montant en TND
  // @param {string}  documentType  — "expense" pour notes de frais
  //
  // @returns {object} { allowed: true, alert_level, message, new_pct, solde_restant }
  const checkBudget = useCallback(async (amountTnd, documentType = "expense") => {
    // Factures fournisseur → toujours autorisé, pas de vérification
    if (documentType === "supplier_invoice") {
      return { allowed: true, alert_level: "ok", message: "" };
    }

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
        body: JSON.stringify({
          amount_tnd    : amountTnd,
          document_type : "expense",
        }),
      });

      if (!res.ok) {
        // Fail-open : erreur backend → on laisse passer
        console.warn("[Budget] check failed, allowing upload");
        return { allowed: true, alert_level: "ok", message: "" };
      }

      const result = await res.json();
      refreshBudget();

      // MODIFIÉ : on force allowed = true côté frontend aussi,
      // au cas où une ancienne version du backend renverrait false
      return { ...result, allowed: true };

    } catch (err) {
      // Erreur réseau → fail-open
      console.warn("[Budget] network error:", err.message);
      return { allowed: true, alert_level: "ok", message: "" };
    }
  }, [username, refreshBudget]);

  return {
    budgetStatus,
    budgetLoading,
    budgetError,
    // MODIFIÉ : toujours false — plus de blocage
    isBudgetBlocked : false,
    // NOUVEAU : true si pct ≥ 95% (utile pour afficher un warning dans l'UI)
    isOverThreshold : (budgetStatus?.pct_utilise ?? 0) >= 95,
    checkBudget,
    refreshBudget,
  };
}