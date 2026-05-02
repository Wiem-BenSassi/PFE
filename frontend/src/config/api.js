// ─── src/config/api.js ────────────────────────────────────────────────────────
// Point d'entrée UNIQUE pour toutes les URLs du projet.
// Ne jamais écrire "http://127.0.0.1:8000" ailleurs dans le code.
//
// Pour changer d'environnement :
//   PC local   → .env.development  (REACT_APP_API_URL=http://127.0.0.1:8000)
//   Téléphone  → .env.mobile       (REACT_APP_API_URL=http://192.168.43.20:8000)

// URL de base du backend FastAPI
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

// URL du frontend (utile pour les redirections OAuth, CORS, etc.)
export const FRONTEND_URL =
  process.env.REACT_APP_FRONTEND_URL || "http://localhost:3000";