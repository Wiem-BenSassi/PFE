import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "vernicolor_archives";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Lit les archives depuis localStorage (renvoie [] si absent ou corrompu) */
const readFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/** Persiste le tableau d'archives dans localStorage */
const writeToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage peut être plein (quota dépassé)
    console.error("Archive: échec d'écriture localStorage →", e);
  }
};

/** Convertit un File en data URL (base64) — utilisé pour "Voir" */
const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
    reader.readAsDataURL(file);
  });

/** Formate la taille en octets → "XX.X KB" ou "X.X MB" */
const formatSize = (bytes) => {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

/** Formate la date courante en "DD/MM/YYYY HH:MM" */
const formatDate = () => {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
};

// ══════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export const useArchive = () => {
  const [archivedFiles, setArchivedFiles] = useState(readFromStorage);

  // Synchronise l'état React avec localStorage à chaque modification
  useEffect(() => {
    writeToStorage(archivedFiles);
  }, [archivedFiles]);

  /**
   * Ajoute un fichier à l'archive.
   * @param {File}   file — objet File natif (ex: depuis input ou drag-and-drop)
   * @param {string} type — "expense" | "supplier_invoice"
   * @returns {Promise<void>}
   */
  const addToArchive = useCallback(async (file, type = "expense") => {
    let dataUrl = null;
    try {
      // Tente de lire le fichier en base64 (pour l'aperçu)
      dataUrl = await fileToDataUrl(file);
    } catch {
      // Si la lecture échoue (ex: fichier trop lourd), on stocke sans preview
      dataUrl = null;
    }

    const entry = {
      id      : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name    : file.name,
      date    : formatDate(),
      size    : formatSize(file.size),
      sizeRaw : file.size,
      type,
      dataUrl,
    };

    setArchivedFiles(prev => [entry, ...prev]); // plus récent en premier
  }, []);

  /**
   * Supprime un fichier de l'archive par son id.
   * @param {string} id
   */
  const removeFromArchive = useCallback((id) => {
    setArchivedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  /** Vide entièrement l'archive */
  const clearArchive = useCallback(() => {
    setArchivedFiles([]);
  }, []);

  return { archivedFiles, addToArchive, removeFromArchive, clearArchive };
};
