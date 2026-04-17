// ─── src/components/TopNav.jsx ───────────────────────────────────────────────
// CORRIGÉ : hamburger toujours visible sur mobile/tablette (< 900px)
// Le seuil passe de 768px à 900px pour couvrir tablettes + petits laptops.
// Détection robuste via matchMedia au lieu de window.innerWidth seul.

import { useState, useEffect, useRef } from "react";
import { AutomotiveIcon } from "./Icons";

// ── Icônes ────────────────────────────────────────────────────────────────────
const IconHamburger = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconClose = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6"  x2="6"  y2="18"/>
    <line x1="6"  y1="6"  x2="18" y2="18"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ── Nav items ─────────────────────────────────────────────────────────────────
const getNavItems = (role) => {
  const all = [
    {
      key: "home", label: "Accueil",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
    },
    {
      key: "upload", label: "Factures",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    },
    {
      key: "dashboard", label: "Dashboard",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    },
    {
      key: "archive", label: "Archive",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
    },
  ];
  const adminRoles = ["Administrateur Système", "Administrateur"];
  if (adminRoles.includes(role)) {
    all.push({
      key: "admin", label: "Admin",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    });
  }
  if (role === "Administrateur Système") {
    all.push({
      key: "sysadmin", label: "Système",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
    });
  }
  return all;
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ user, size = 34 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: Math.round(size * 0.38), fontWeight: 700, color: "white",
    fontFamily: "'Syne',sans-serif", userSelect: "none",
  }}>
    {(user || "?")[0].toUpperCase()}
  </div>
);

// ── Hook : détection mobile via matchMedia (plus fiable que innerWidth seul) ──
// BREAKPOINT : 900px → hamburger en dessous, nav desktop au-dessus.
// Changez BREAKPOINT si vous voulez ajuster le seuil.
const BREAKPOINT = 900;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    // Initialisation synchrone correcte dès le premier render
    () => typeof window !== "undefined" && window.innerWidth < BREAKPOINT
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`);

    // Synchroniser l'état avec la valeur courante de matchMedia
    setIsMobile(mq.matches);

    // Écouter les changements
    const handler = (e) => setIsMobile(e.matches);

    // Compatibilité : addEventListener (moderne) ou addListener (ancien Safari)
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  return isMobile;
}

// ══════════════════════════════════════════════════════════════════════════════
// TOP NAV
// ══════════════════════════════════════════════════════════════════════════════
const TopNav = ({ page, setPage, user = "Admin", onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();                // ← hook corrigé
  const menuRef  = useRef(null);
  const role     = localStorage.getItem("role") || "";
  const navItems = getNavItems(role);

  // Ferme le menu quand on passe en desktop
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  // Ferme le menu au clic extérieur
  useEffect(() => {
    if (!menuOpen) return;
    const onOut = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown",  onOut);
    document.addEventListener("touchstart", onOut, { passive: true });
    return () => {
      document.removeEventListener("mousedown",  onOut);
      document.removeEventListener("touchstart", onOut);
    };
  }, [menuOpen]);

  // Bloque le scroll body quand le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = (menuOpen && isMobile) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, isMobile]);

  const navigate = (key) => { setPage(key); setMenuOpen(false); };

  return (
    <>
      {/* ── Barre principale ─────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: "var(--nav-h)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 var(--page-px)",
        background: "rgba(6,10,20,0.94)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        gap: 8,
      }}>

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <button
          onClick={() => navigate("home")}
          style={{
            display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
            background: "none", border: "none", padding: "6px 0", flexShrink: 0,
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AutomotiveIcon size={19} color="white" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "#e8f0ff" }}>
              <span style={{ color: "#3b82f6" }}>Verni</span>Color
            </span>
            <span style={{ fontSize: 9, letterSpacing: "0.18em", color: "#3a4d72", textTransform: "uppercase", marginTop: 1 }}>
              Tunisia
            </span>
          </div>
        </button>

        {/* ── Desktop : liens de navigation (affichés si > BREAKPOINT) ──── */}
        {!isMobile && (
          <nav style={{
            display: "flex", alignItems: "center", gap: 2,
            flex: 1, justifyContent: "center", overflow: "hidden",
          }}>
            {navItems.map(item => (
              <button
                key={item.key}
                className={`nav-link ${page === item.key ? "active" : ""}`}
                onClick={() => navigate(item.key)}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        )}

        {/* ── Droite ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

          {/* Desktop : avatar + nom + déconnexion */}
          {!isMobile && (
            <>
              <Avatar user={user} />
              <span style={{
                fontSize: 13, color: "#5a6e99", maxWidth: 140,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {user}
              </span>
              <button
                className="btn-ghost"
                onClick={onLogout}
                style={{ fontSize: 12, padding: "0 12px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <IconLogout /> Déconnexion
              </button>
            </>
          )}

          {/* ── MOBILE : hamburger ────────────────────────────────────── */}
          {isMobile && (
            <div ref={menuRef} style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

                {/* Avatar compact */}
                <Avatar user={user} size={32} />

                {/* Bouton hamburger */}
                <button
                  onClick={() => setMenuOpen(prev => !prev)}
                  aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                  aria-expanded={menuOpen}
                  style={{
                    width: 46, height: 46,
                    borderRadius: 12,
                    border: `1.5px solid ${menuOpen ? "rgba(37,99,235,0.6)" : "rgba(255,255,255,0.12)"}`,
                    background: menuOpen ? "rgba(37,99,235,0.18)" : "rgba(255,255,255,0.05)",
                    color: "#e8f0ff",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  {menuOpen ? <IconClose /> : <IconHamburger />}
                </button>
              </div>

              {/* ── Menu déroulant ─────────────────────────────────────── */}
              {menuOpen && (
                <>
                  {/* Overlay */}
                  <div
                    style={{
                      position: "fixed",
                      top: "var(--nav-h)", left: 0, right: 0, bottom: 0,
                      background: "rgba(0,0,0,0.55)",
                      backdropFilter: "blur(4px)",
                      WebkitBackdropFilter: "blur(4px)",
                      zIndex: 8000,
                    }}
                    onClick={() => setMenuOpen(false)}
                  />

                  {/* Panel menu */}
                  <div style={{
                    position: "fixed",
                    top: "var(--nav-h)",
                    right: 0, left: 0,
                    background: "linear-gradient(170deg,#0d1627 0%,#080f1e 100%)",
                    borderBottom: "1px solid rgba(37,99,235,0.25)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.85)",
                    padding: "10px 14px 20px",
                    animation: "hamburger-in 0.22s cubic-bezier(0.22,1,0.36,1) both",
                    zIndex: 8001,
                    maxHeight: `calc(100vh - var(--nav-h))`,
                    overflowY: "auto",
                  }}>

                    {/* Infos utilisateur */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 10px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                      marginBottom: 10,
                    }}>
                      <Avatar user={user} size={48} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontFamily: "'Syne',sans-serif", fontSize: 16,
                          fontWeight: 700, color: "#e8f0ff",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {user}
                        </p>
                        <p style={{ fontSize: 12, color: "#5a6e99", marginTop: 3 }}>{role}</p>
                      </div>
                    </div>

                    {/* Liens de navigation */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {navItems.map(item => (
                        <button
                          key={item.key}
                          onClick={() => navigate(item.key)}
                          style={{
                            display: "flex", alignItems: "center", gap: 14,
                            width: "100%",
                            padding: "14px 16px",
                            borderRadius: 13,
                            fontSize: 15,
                            fontWeight: page === item.key ? 600 : 400,
                            color: page === item.key ? "#e8f0ff" : "#c0cfee",
                            cursor: "pointer",
                            border: "none",
                            background: page === item.key ? "rgba(37,99,235,0.18)" : "transparent",
                            fontFamily: "'DM Sans',sans-serif",
                            textAlign: "left",
                            minHeight: 52,
                            transition: "background 0.15s, color 0.15s",
                          }}
                        >
                          {/* Icône colorée si page active */}
                          <span style={{
                            color: page === item.key ? "#3b82f6" : "#5a6e99",
                            display: "flex", flexShrink: 0,
                          }}>
                            {item.icon}
                          </span>
                          {item.label}
                          {/* Point indicateur page active */}
                          {page === item.key && (
                            <div style={{
                              marginLeft: "auto",
                              width: 7, height: 7, borderRadius: "50%",
                              background: "#3b82f6",
                              boxShadow: "0 0 8px rgba(59,130,246,0.6)",
                            }} />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Séparateur + Déconnexion */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: 12, paddingTop: 12 }}>
                      <button
                        onClick={() => { setMenuOpen(false); onLogout(); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          width: "100%",
                          padding: "14px 16px",
                          borderRadius: 13,
                          fontSize: 15, fontWeight: 500,
                          color: "#f87171",
                          cursor: "pointer",
                          border: "none",
                          background: "rgba(248,113,113,0.06)",
                          fontFamily: "'DM Sans',sans-serif",
                          textAlign: "left",
                          minHeight: 52,
                          transition: "background 0.15s",
                        }}
                      >
                        <IconLogout />
                        Déconnexion
                      </button>
                    </div>

                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Corner badge (desktop uniquement, > 1024px) ───────────────────────────────
export const CornerBadge = () => {
  const [show, setShow] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setShow(mq.matches);
    const h = (e) => setShow(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", h);
      return () => mq.removeEventListener("change", h);
    } else {
      mq.addListener(h);
      return () => mq.removeListener(h);
    }
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", top: 14, left: 14, zIndex: 100,
      display: "flex", alignItems: "center", gap: 9,
      background: "rgba(6,10,20,0.88)", backdropFilter: "blur(14px)",
      border: "1px solid rgba(37,99,235,0.25)", borderRadius: 13,
      padding: "7px 12px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
      animation: "fade-in 1s ease 0.4s both",
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <AutomotiveIcon size={15} color="white" />
      </div>
      <div>
        <div style={{
          fontFamily: "'Syne',sans-serif", fontSize: 12,
          fontWeight: 700, color: "#e8f0ff", lineHeight: 1,
        }}>
          <span style={{ color: "#3b82f6" }}>Verni</span>Color
        </div>
        <div style={{
          fontSize: 8, letterSpacing: "0.15em", color: "#3a4d72",
          textTransform: "uppercase", marginTop: 2,
        }}>
          Tunisia
        </div>
      </div>
    </div>
  );
};

export default TopNav;