// ─── src/pages/HomePage.jsx ──────────────────────────────────────────────────
// RESPONSIVE COMPLET — mobile-first, grilles adaptatives, stat cards, budget

import { useState, useEffect } from "react";
import BudgetWidget from "../components/BudgetWidget";

const HomePage = ({ setPage, username = "Admin", uploadedInvoices = [] }) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [isTablet, setIsTablet] = useState(() => window.innerWidth < 900);

  useEffect(() => {
    const h = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth < 900);
    };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const stats = [
    {
      label:"Total Factures",
      value: uploadedInvoices.length.toString(),
      delta:"+12%", pos:true,
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
      accent:"#3b82f6",
    },
    {
      label:"Traitées",
      value:"0", delta:"+8%", pos:true,
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>,
      accent:"#10b981",
    },
    {
      label:"En attente",
      value: uploadedInvoices.length.toString(),
      delta:"-3%", pos:false,
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
      accent:"#f59e0b",
    },
    {
      label:"Revenus",
      value:"TND 0", delta:"+19%", pos:true,
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
      accent:"#3b82f6",
    },
  ];

  return (
    <div style={{ minHeight:"100vh", padding:"var(--page-pt) var(--page-px) 56px",
                  position:"relative", zIndex:1 }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* ── Bienvenue ────────────────────────────────────────────────────── */}
        <div className="fe1" style={{ marginBottom:24 }}>
          <p style={{ fontSize:11, color:"#5a6e99", letterSpacing:"0.06em",
                      textTransform:"uppercase", marginBottom:6 }}>
            {greeting},
          </p>
          <h1 className="page-title" style={{ marginBottom:6 }}>
            Bienvenue,{" "}
            <span style={{ color:"#3b82f6" }}>{username}</span>
          </h1>
          <p style={{ color:"#5a6e99", fontSize:14, fontWeight:300 }}>
            Voici l'état de vos factures aujourd'hui.
          </p>
        </div>

        {/* ── Stats — 4 sur desktop, 2×2 sur mobile ────────────────────────── */}
        <div className="fe2 grid-4" style={{ marginBottom:22 }}>
          {stats.map((s, i) => (
            <div key={i} className="surface-card"
                 style={{ padding:isMobile?"13px 14px":"18px 20px",
                          display:"flex", alignItems:"center", gap:12 }}>
              <div style={{
                width:isMobile?38:42, height:isMobile?38:42,
                borderRadius:11, flexShrink:0,
                background:`rgba(${s.accent==="#10b981"?"16,185,129":s.accent==="#f59e0b"?"245,158,11":"37,99,235"},0.1)`,
                border:`1px solid rgba(${s.accent==="#10b981"?"16,185,129":s.accent==="#f59e0b"?"245,158,11":"37,99,235"},0.2)`,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {s.icon}
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:10, color:"#5a6e99", marginBottom:3,
                            textTransform:"uppercase", letterSpacing:"0.05em",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {s.label}
                </p>
                <p className="stat-value">{s.value}</p>
                <p style={{ fontSize:10, color:s.pos?"#10b981":"#f87171",
                            marginTop:3, fontWeight:500 }}>
                  {s.delta} ce mois
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Budget widget ─────────────────────────────────────────────────── */}
        <div className="fe3" style={{ marginBottom:22 }}>
          <BudgetWidget compact={isMobile} />
        </div>

        {/* ── Actions rapides ───────────────────────────────────────────────── */}
        <div className="fe4 grid-2" style={{ marginBottom:22 }}>

          {/* Upload */}
          <div
            className="surface-card"
            onClick={() => setPage("upload")}
            style={{
              padding:isMobile?"18px":"28px 28px",
              cursor:"pointer", transition:"all 0.3s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor="rgba(37,99,235,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"; }}
          >
            <div style={{ position:"absolute", top:0, right:0, width:80, height:80,
                          background:"radial-gradient(circle,rgba(37,99,235,0.1) 0%,transparent 70%)",
                          pointerEvents:"none" }} />
            <div style={{
              width:isMobile?44:52, height:isMobile?44:52, borderRadius:14, marginBottom:14,
              background:"linear-gradient(135deg,rgba(37,99,235,0.22),rgba(59,130,246,0.15))",
              border:"1px solid rgba(37,99,235,0.35)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <h2 style={{ fontFamily:"'Syne',sans-serif",
                         fontSize:isMobile?16:20, fontWeight:700, color:"#e8f0ff", marginBottom:6 }}>
              Upload Factures
            </h2>
            {!isMobile && (
              <p style={{ color:"#5a6e99", fontSize:13, fontWeight:300, lineHeight:1.6, marginBottom:16 }}>
                Importez PDF ou images depuis vos fournisseurs.
              </p>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:6,
                          color:"#3b82f6", fontSize:13, fontWeight:500 }}>
              Commencer
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
              </svg>
            </div>
          </div>

          {/* Dashboard */}
          <div
            className="surface-card"
            onClick={() => setPage("dashboard")}
            style={{
              padding:isMobile?"18px":"28px 28px",
              cursor:"pointer", transition:"all 0.3s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor="rgba(59,130,246,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"; }}
          >
            <div style={{ position:"absolute", top:0, right:0, width:80, height:80,
                          background:"radial-gradient(circle,rgba(59,130,246,0.09) 0%,transparent 70%)",
                          pointerEvents:"none" }} />
            <div style={{
              width:isMobile?44:52, height:isMobile?44:52, borderRadius:14, marginBottom:14,
              background:"linear-gradient(135deg,rgba(59,130,246,0.2),rgba(37,99,235,0.15))",
              border:"1px solid rgba(59,130,246,0.3)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <h2 style={{ fontFamily:"'Syne',sans-serif",
                         fontSize:isMobile?16:20, fontWeight:700, color:"#e8f0ff", marginBottom:6 }}>
              Dashboard
            </h2>
            {!isMobile && (
              <p style={{ color:"#5a6e99", fontSize:13, fontWeight:300, lineHeight:1.6, marginBottom:16 }}>
                Analytiques, tendances et performances fournisseurs.
              </p>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:6,
                          color:"#60a5fa", fontSize:13, fontWeight:500 }}>
              Voir les analytics
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Factures récentes ─────────────────────────────────────────────── */}
        <div className="fe5 surface-card">
          <div style={{
            padding:`18px var(--card-pad) 0`,
            display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:4,
          }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:"#e8f0ff" }}>
              Factures récentes
            </h3>
            <button
              className="btn-ghost"
              onClick={() => setPage("archive")}
              style={{ fontSize:12, padding:"6px 14px" }}
            >
              Voir tout
            </button>
          </div>

          {uploadedInvoices.length === 0 ? (
            <div style={{ textAlign:"center", padding:"36px 20px" }}>
              <div style={{
                width:48, height:48, borderRadius:13, margin:"0 auto 12px",
                background:"rgba(37,99,235,0.07)", border:"1px solid rgba(37,99,235,0.14)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3a4d72" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                </svg>
              </div>
              <p style={{ fontSize:14, color:"#3a4d72", marginBottom:14 }}>Aucune facture uploadée.</p>
              <button
                className="btn-primary"
                onClick={() => setPage("upload")}
                style={{ fontSize:14, padding:"0 24px" }}
              >
                Uploader maintenant
              </button>
            </div>
          ) : (
            uploadedInvoices.slice(-5).reverse().map((inv, i) => (
              <div key={i} className="mobile-list-item">
                <div style={{
                  width:34, height:34, borderRadius:9, flexShrink:0,
                  background:"rgba(37,99,235,0.09)", border:"1px solid rgba(37,99,235,0.15)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p className="truncate" style={{ fontSize:13, fontWeight:500, color:"#e8f0ff" }}>{inv.name}</p>
                  <p style={{ fontSize:11, color:"#5a6e99", marginTop:2 }}>{inv.date} · {inv.size}</p>
                </div>
                <span className="badge badge-blue" style={{ flexShrink:0 }}>En attente</span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default HomePage;