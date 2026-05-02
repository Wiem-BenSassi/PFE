// ─── src/Api.js ───────────────────────────────────────────────────────────────
// Centralise tous les appels au backend FastAPI.
// Utilise le username stocké dans localStorage pour les headers X-Username.
// Le backend utilise X-Username pour résoudre l'utilisateur (pas de JWT pour l'instant).

import { API_BASE_URL } from "./config/api";
const BASE = API_BASE_URL;

// ── Helper : headers communs ──────────────────────────────────────────────────
const getHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  "X-Username": localStorage.getItem("username") || "",
  ...extra,
});

// ── Helper : gestion d'erreur unifiée ────────────────────────────────────────
const handleResponse = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur serveur (${res.status})`);
  }
  return res.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /auth/login
 * @param {{ email: string, password: string }} data
 * @returns {{ message, username, role }}
 */
export const loginUser = async (data) => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICES — Factures fournisseur
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /invoices/upload
 * Envoie un fichier PDF/image vers le backend pour OCR.
 * file_type doit être "supplier_invoice".
 *
 * @param {File} file
 * @returns {{
 *   status: "success"|"duplicate"|"error",
 *   document_id: number,
 *   invoice_ids: number[],
 *   extracted_invoices: Array<{fields, confidence, needs_review}>,
 *   processing_time_ms: number
 * }}
 */
export const uploadInvoice = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_type", "supplier_invoice");

  const res = await fetch(`${BASE}/invoices/upload`, {
    method: "POST",
    headers: {
      // PAS de Content-Type ici — le browser le gère automatiquement avec le boundary
      "X-Username": localStorage.getItem("username") || "",
    },
    body: formData,
  });
  return handleResponse(res);
};

/**
 * GET /invoices/{document_id}
 * Récupère les données complètes d'une facture (OCR + champs extraits).
 *
 * @param {number} documentId
 * @returns {{
 *   document_id, invoice_id, file_name, status, document_type,
 *   ocr_confidence, extraction_confidence,
 *   extracted_fields: { invoice_number, invoice_date, supplier_name, total_ht,
 *                       total_vat, total_ttc, currency, tax_id },
 *   needs_review: boolean,
 *   raw_text: string
 * }}
 */
export const getInvoice = async (documentId) => {
  const res = await fetch(`${BASE}/invoices/${documentId}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

/**
 * PATCH /invoices/{document_id}/validate
 * Envoie les données corrigées + action (validate | reject).
 *
 * @param {number} documentId
 * @param {{
 *   invoice_number?, invoice_date?, supplier_name?,
 *   total_ht?, total_vat?, total_ttc?, currency?, tax_id?, notes?,
 *   action: "validate"|"reject",
 *   rejection_reason?: string
 * }} payload
 * @returns {{ status, document_id, invoice_id, message }}
 */
export const validateInvoice = async (documentId, payload) => {
  const res = await fetch(`${BASE}/invoices/${documentId}/validate`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

/**
 * GET /invoices/
 * Liste toutes les factures avec filtres optionnels.
 *
 * @param {{ status?, needs_review?, supplier_id?, limit?, offset? }} params
 */
export const listInvoices = async (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
  ).toString();
  const res = await fetch(`${BASE}/invoices/${qs ? "?" + qs : ""}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

// ═══════════════════════════════════════════════════════════════════════════════
// RECEIPTS — Notes de frais
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /receipts/upload
 * Upload + OCR d'une note de frais.
 *
 * @param {File} file
 * @returns {{
 *   status: "success"|"duplicate"|"error",
 *   document_id: number,
 *   extracted_fields: { merchant_name, receipt_date, total_amount, currency, ... },
 *   review_fields: object,
 *   threshold_result: { requires_validation: boolean, threshold: number, amount: number },
 *   extraction_score: number
 * }}
 */
export const uploadReceipt = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE}/receipts/upload`, {
    method: "POST",
    headers: {
      "X-Username": localStorage.getItem("username") || "",
    },
    body: formData,
  });
  return handleResponse(res);
};

/**
 * GET /receipts/{document_id}
 * Récupère les données complètes d'une note de frais.
 *
 * @param {number} documentId
 */
export const getReceipt = async (documentId) => {
  const res = await fetch(`${BASE}/receipts/${documentId}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

/**
 * POST /receipts/confirm-review
 * Confirme les données corrigées d'une note de frais.
 *
 * @param {{
 *   document_id: number,
 *   merchant_name?, receipt_date?, total_amount?,
 *   currency?, payment_method?, category_code?, notes?
 * }} payload
 * @returns {{ status, receipt_id, document_id, message }}
 */
export const confirmReceipt = async (payload) => {
  const res = await fetch(`${BASE}/receipts/confirm-review`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

/**
 * PATCH /receipts/{document_id}/validate
 * Alias de rétro-compatibilité pour valider/rejeter une note de frais.
 *
 * @param {number} documentId
 * @param {{ action: "validate"|"reject", ... }} payload
 */
export const validateReceipt = async (documentId, payload) => {
  const res = await fetch(`${BASE}/receipts/${documentId}/validate`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

/**
 * GET /receipts/
 * Liste toutes les notes de frais avec filtres.
 */
export const listReceipts = async (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
  ).toString();
  const res = await fetch(`${BASE}/receipts/${qs ? "?" + qs : ""}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};