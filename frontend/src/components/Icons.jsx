// ─── src/components/Icons.jsx ────────────────────────────────────────────────
// Toutes les icônes SVG réutilisables de l'application.
// Importées individuellement dans chaque fichier qui en a besoin.

// ── Icône volant de voiture (logo de marque VerniColor) ───────────────────────
export const AutomotiveIcon = ({ size = 30, color = "white" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="13" stroke={color} strokeWidth="2.2" fill="none" opacity="0.95"/>
    <circle cx="16" cy="16" r="3.5" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="16" y1="12.5" x2="16" y2="3.2"   stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="19.2" y1="18.4" x2="27.5" y2="23.2" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="12.8" y1="18.4" x2="4.5"  y2="23.2" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

// ── Spinner de chargement (cercle qui tourne) ─────────────────────────────────
export const Spinner = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" style={{ animation: "spin-ring 0.8s linear infinite" }}>
    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5"/>
    <path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

// ── Icône œil — afficher/masquer le mot de passe ──────────────────────────────
// open=true → œil ouvert (mot de passe visible)
// open=false → œil barré (mot de passe masqué)
export const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    )}
  </svg>
);

// ── Icône document / facture ──────────────────────────────────────────────────
export const FileIcon = ({ color = "#3b82f6", size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
  </svg>
);