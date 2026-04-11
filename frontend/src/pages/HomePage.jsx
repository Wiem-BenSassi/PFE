// ─── src/pages/HomePage.jsx ──────────────────────────────────────────────────
// Page d'accueil après login.
// Affiche : message de bienvenue, stats, widget budget, cartes d'action, tableau des factures récentes.

import BudgetWidget from "../components/BudgetWidget";   // ← AJOUTÉ

const HomePage = ({ setPage, username = "Admin", uploadedInvoices = [] }) => {

  // Cartes de statistiques en haut de page
  const stats = [
    {
      label: "Total Invoices",
      value: uploadedInvoices.length.toString(),
      delta: "+12%",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    },
    {
      label: "Processed",
      value: "0",
      delta: "+8%",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>,
    },
    {
      label: "Pending Review",
      value: uploadedInvoices.length.toString(),
      delta: "-3%",
      neg: true,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    },
    {
      label: "Total Revenue",
      value: "TND 0",
      delta: "+19%",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    },
  ];

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", padding: "80px 28px 40px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Message de bienvenue ─────────────────────────────────────────── */}
        <div className="fe1" style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 13, color: "#5a6e99", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Good morning,</p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 36, fontWeight: 800, letterSpacing: "-0.5px", color: "#e8f0ff", marginBottom: 8 }}>
            Welcome back, <span style={{ color: "#3b82f6" }}>{username}</span>
          </h1>
          <p style={{ color: "#5a6e99", fontSize: 15, fontWeight: 300 }}>Here's what's happening with your automotive invoices today.</p>
        </div>

        {/* ── Grille des 4 cartes de statistiques ─────────────────────────── */}
        <div className="fe2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginBottom: 40 }}>
          {stats.map((s, i) => (
            <div key={i} className="surface-card" style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(37,99,235,0.09)", border: "1px solid rgba(37,99,235,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <p style={{ fontSize: 12, color: "#5a6e99", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: "#e8f0ff", lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: s.neg ? "#f87171" : "#10b981", marginTop: 4, fontWeight: 500 }}>{s.delta} this month</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Budget personnel ─────────────────────────────────────────── */}
        {/* ← AJOUTÉ : widget budget après les cartes de stats */}
        <div className="fe3" style={{ marginBottom: 40 }}>
          <BudgetWidget />
        </div>

        {/* ── Cartes d'action : Upload et Dashboard ───────────────────────── */}
        <div className="fe4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24, marginBottom: 40 }}>

          {/* Carte Upload */}
          <div
            className="surface-card"
            onClick={() => setPage("upload")}
            style={{ padding: "36px 32px", cursor: "pointer", transition: "all 0.35s", position: "relative", overflow: "hidden" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.4)"; e.currentTarget.style.boxShadow = "0 22px 65px rgba(0,0,0,0.55), 0 0 45px rgba(37,99,235,0.14)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)"; }}
          >
            <div style={{ position: "absolute", top: 0, right: 0, width: 130, height: 130, background: "radial-gradient(circle,rgba(37,99,235,0.11) 0%,transparent 70%)", pointerEvents: "none" }}/>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,rgba(37,99,235,0.22),rgba(59,130,246,0.15))", border: "1px solid rgba(37,99,235,0.35)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: "#e8f0ff", marginBottom: 10 }}>Upload Invoices</h2>
            <p style={{ color: "#5a6e99", fontSize: 14, fontWeight: 300, lineHeight: 1.6, marginBottom: 24 }}>Import PDF or image invoices from your automotive suppliers. Drag & drop or browse your files.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#3b82f6", fontSize: 14, fontWeight: 500 }}>
              Start uploading
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
            </div>
          </div>

          {/* Carte Dashboard */}
          <div
            className="surface-card"
            onClick={() => setPage("dashboard")}
            style={{ padding: "36px 32px", cursor: "pointer", transition: "all 0.35s", position: "relative", overflow: "hidden" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)"; e.currentTarget.style.boxShadow = "0 22px 65px rgba(0,0,0,0.55), 0 0 45px rgba(59,130,246,0.14)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)"; }}
          >
            <div style={{ position: "absolute", top: 0, right: 0, width: 130, height: 130, background: "radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 70%)", pointerEvents: "none" }}/>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,rgba(59,130,246,0.2),rgba(37,99,235,0.15))", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6"  y1="20" x2="6"  y2="14"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: "#e8f0ff", marginBottom: 10 }}>View Dashboards</h2>
            <p style={{ color: "#5a6e99", fontSize: 14, fontWeight: 300, lineHeight: 1.6, marginBottom: 24 }}>Explore invoice analytics, revenue trends, and supplier performance metrics across your operations.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#60a5fa", fontSize: 14, fontWeight: 500 }}>
              Open analytics
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
            </div>
          </div>
        </div>

        {/* ── Tableau des factures récentes ────────────────────────────────── */}
        <div className="fe5 surface-card" style={{ padding: "28px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: "#e8f0ff" }}>Recent Invoices</h3>
            <button className="btn-ghost" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => setPage("upload")}>View all</button>
          </div>

          {uploadedInvoices.length === 0 ? (
            /* État vide */
            <div style={{ textAlign: "center", padding: "36px 20px" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.14)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3a4d72" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              </div>
              <p style={{ fontSize: 14, color: "#3a4d72", fontWeight: 400 }}>No invoices uploaded yet.</p>
              <p style={{ fontSize: 12, color: "#2a3550", marginTop: 6, fontWeight: 300 }}>Upload invoices from the Invoices page to see them here.</p>
            </div>
          ) : (
            /* Les 4 dernières factures uploadées */
            uploadedInvoices.slice(-4).reverse().map((inv, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(37,99,235,0.09)", border: "1px solid rgba(37,99,235,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#e8f0ff", marginBottom: 2 }}>{inv.name}</p>
                    <p style={{ fontSize: 11, color: "#5a6e99" }}>{inv.date}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontSize: 11, color: "#5a6e99" }}>{inv.size}</span>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 500, background: "rgba(37,99,235,0.1)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.22)" }}>
                    Pending
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;