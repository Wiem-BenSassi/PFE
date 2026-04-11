// ─── src/hooks/useBudget.js ───────────────────────────────────────────────────
// Hook React : gestion du budget notes de frais.
//
// ⚠️  RÈGLE MÉTIER : le seuil s'applique UNIQUEMENT aux notes de frais.
//     Toujours passer document_type="expense" pour les notes de frais.
//     Les factures fournisseur (supplier_invoice) ne sont JAMAIS bloquées.
//
// Usage :
//   const { budgetStatus, checkBudget, isBudgetBlocked } = useBudget();
//
//   // Avant de confirmer une note de frais :
//   const result = await checkBudget(montant, "expense");
//   if (!result.allowed) { setError(result.message); return; }
//
//   // Pour une facture fournisseur : NE PAS appeler checkBudget
//   // (les factures fournisseur ne sont pas soumises au seuil)

import { useState, useEffect, useCallback } from "react";

const BASE_URL = "http://127.0.0.1:8000";

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
  // ⚠️  APPELER UNIQUEMENT pour les notes de frais (document_type="expense").
  //     Pour les factures fournisseur : ne pas appeler (toujours autorisé).
  //
  // @param {number}  amountTnd     — montant en TND
  // @param {string}  documentType  — "expense" TOUJOURS pour notes de frais
  //
  // @returns {object} { allowed, alert_level, message, new_pct, solde_restant }
  const checkBudget = useCallback(async (amountTnd, documentType = "expense") => {
    // Sécurité : les factures fournisseur ne sont jamais bloquées
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
          document_type : "expense",  // toujours "expense" — jamais supplier_invoice
        }),
      });

      if (!res.ok) {
        // Fail-open : en cas d'erreur backend, on laisse passer
        console.warn("Budget check failed, allowing upload");
        return { allowed: true, alert_level: "ok", message: "" };
      }

      const result = await res.json();
      refreshBudget();
      return result;

    } catch (err) {
      // Erreur réseau → fail-open
      console.warn("Budget check network error:", err.message);
      return { allowed: true, alert_level: "ok", message: "" };
    }
  }, [username, refreshBudget]);

  return {
    budgetStatus,
    budgetLoading,
    budgetError,
    // TRUE uniquement si le plafond de notes de frais est dépassé
    isBudgetBlocked : budgetStatus?.is_blocked ?? false,
    checkBudget,
    refreshBudget,
  };
}