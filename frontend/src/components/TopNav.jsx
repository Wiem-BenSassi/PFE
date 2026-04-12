// ─── src/components/TopNav.jsx ───────────────────────────────────────────────
// Barre de navigation fixe en haut de l'écran.
// Visible uniquement quand l'utilisateur est connecté (pas sur la page login).
// Contient : logo cliquable, liens de navigation, avatar utilisateur, déconnexion.
// MODIFICATION : ajout du lien "Archive" ← AJOUTÉ

import { AutomotiveIcon } from "./Icons";

// ── Barre de navigation principale ───────────────────────────────────────────
const TopNav = ({ page, setPage, user = "Admin", onLogout }) => (
  <div style={{
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 60,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 28px",
    background: "rgba(6,10,20,0.88)", backdropFilter: "blur(18px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  }}>
    
    {/* Logo — clique pour revenir à l'accueil */}
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
      onClick={() => setPage("home")}
    >
      <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AutomotiveIcon size={18} color="white" />
      </div>
      <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "#e8f0ff" }}>
        <span style={{ color: "#3b82f6" }}>Verni</span>Color
      </span>
      <span style={{ fontSize: 9, letterSpacing: "0.18em", color: "#3a4d72", textTransform: "uppercase", marginTop: 2 }}>
        Tunisia
      </span>
    </div>

    {/* Liens de navigation — page active mise en surbrillance */}
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button className={`nav-link ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>
        Home
      </button>

      <button className={`nav-link ${page === "upload" ? "active" : ""}`} onClick={() => setPage("upload")}>
        Invoices
      </button>

      <button className={`nav-link ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}>
        Dashboard
      </button>

      {/* ── Archive ← AJOUTÉ — visible par tous les rôles connectés ──────── */}
      <button
        className={`nav-link ${page === "archive" ? "active" : ""}`}
        onClick={() => setPage("archive")}
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        {/* Icône archive inline */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="21,8 21,21 3,21 3,8"/>
          <rect x="1" y="3" width="22" height="5"/>
          <line x1="10" y1="12" x2="14" y2="12"/>
        </svg>
        Archive
      </button>

      {/* 🔐 Bouton Admin — visible pour Admin et Admin Système */}
      {["Administrateur Système", "Administrateur"].includes(
        localStorage.getItem("role")
      ) && (
        <button
          className={`nav-link ${page === "admin" ? "active" : ""}`}
          onClick={() => setPage("admin")}
        >
          Admin
        </button>
      )}

      {/* 🛠️ Bouton Système — visible UNIQUEMENT pour Administrateur Système */}
      {localStorage.getItem("role") === "Administrateur Système" && (
        <button
          className={`nav-link ${page === "sysadmin" ? "active" : ""}`}
          onClick={() => setPage("sysadmin")}
        >
          Système
        </button>
      )}
    </div>

    {/* Zone utilisateur : avatar + nom + bouton déconnexion */}
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", fontFamily: "'Syne',sans-serif" }}>
        {user[0]}
      </div>
      <span style={{ fontSize: 13, color: "#5a6e99" }}>{user}</span>
      <button
        className="btn-ghost"
        onClick={onLogout}
        style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16,17 21,12 16,7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Logout
      </button>
    </div>
  </div>
);

// ── Badge logo coin haut-gauche ───────────────────────────────────────────────
export const CornerBadge = () => (
  <div style={{
    position: "fixed", top: 20, left: 20, zIndex: 100,
    display: "flex", alignItems: "center", gap: 10,
    background: "rgba(6,10,20,0.88)", backdropFilter: "blur(14px)",
    border: "1px solid rgba(37,99,235,0.28)", borderRadius: 14,
    padding: "8px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
    animation: "fade-in 1s ease 0.4s both",
  }}>
    <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <AutomotiveIcon size={16} color="white" />
    </div>
    <div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, lineHeight: 1.1, color: "#e8f0ff" }}>
        <span style={{ color: "#3b82f6" }}>Verni</span>Color
      </div>
      <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.15em", color: "#3a4d72", textTransform: "uppercase" }}>
        Tunisia
      </div>
    </div>
  </div>
);

export default TopNav;