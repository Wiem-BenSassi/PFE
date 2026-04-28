import { useState, useEffect, useCallback } from "react";
const getStorageKey = () => {
  const username = localStorage.getItem("username") || "anonymous";
  return `vernicolor_archives_${username}`;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Lit les archives de l'utilisateur connecté depuis localStorage */
const readFromStorage = () => {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/** Persiste les archives de l'utilisateur connecté dans localStorage */
const writeToStorage = (data) => {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
  } catch (e) {
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

  // Initialise l'état avec les archives de l'utilisateur connecté
  const [archivedFiles, setArchivedFiles] = useState(readFromStorage);

  // Synchronise l'état React avec localStorage à chaque modification
  useEffect(() => {
    writeToStorage(archivedFiles);
  }, [archivedFiles]);

  // ── Recharge les archives quand l'utilisateur change ──────────────────────
  // Utile si deux utilisateurs se connectent sur le même navigateur
  useEffect(() => {
    setArchivedFiles(readFromStorage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStorage.getItem("username")]);

  /**
   * Ajoute un fichier à l'archive de l'utilisateur connecté.
   * @param {File}   file — objet File natif
   * @param {string} type — "expense" | "supplier_invoice"
   */
  const addToArchive = useCallback(async (file, type = "expense") => {
    let dataUrl = null;
    try {
      dataUrl = await fileToDataUrl(file);
    } catch {
      dataUrl = null;
    }

    const entry = {
      id        : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name      : file.name,
      date      : formatDate(),
      size      : formatSize(file.size),
      sizeRaw   : file.size,
      type,
      dataUrl,
      // ✅ Traçabilité : on sait quel utilisateur a archivé ce fichier
      uploadedBy: localStorage.getItem("username") || "anonymous",
    };

    setArchivedFiles(prev => [entry, ...prev]);
  }, []);

  /**
   * Supprime un fichier de l'archive par son id.
   */
  const removeFromArchive = useCallback((id) => {
    setArchivedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  /** Vide entièrement l'archive de l'utilisateur connecté */
  const clearArchive = useCallback(() => {
    setArchivedFiles([]);
  }, []);

  return { archivedFiles, addToArchive, removeFromArchive, clearArchive };
};