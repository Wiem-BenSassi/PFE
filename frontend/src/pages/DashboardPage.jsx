// ─── src/pages/DashboardPage.jsx ─────────────────────────────────────────────
// Page analytics : KPIs, graphiques barres/ligne, donut statut, top fournisseurs.

import { MiniBarChart, MiniLineChart } from "../components/Charts";

const DashboardPage = () => {

  // NOTE : l'accès est maintenant contrôlé dans VerniColorApp.jsx via goTo().
  // Si l'utilisateur n'a pas le rôle "Comptable", il est redirigé vers Home
  // avec un toast d'erreur AVANT même d'arriver sur cette page.
  // Ce composant s'affiche donc uniquement si l'accès est autorisé.

  const months      = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const invoiceData = [42,58,53,71,68,84,79,92,88,104,98,112];
  const revenueData = [38,52,47,65,70,81,74,90,85,99,94,108];

  const suppliers = [
    { name: "AutoParts Pro",       invoices: 312, amount: "TND 142K", pct: 31 },
    { name: "MechaniX Tunisia",    invoices: 248, amount: "TND 98K",  pct: 25 },
    { name: "CarTech Sfax",        invoices: 201, amount: "TND 84K",  pct: 20 },
    { name: "VehicleParts Co.",    invoices: 163, amount: "TND 61K",  pct: 16 },
    { name: "AutoShield Tunis",    invoices: 90,  amount: "TND 34K",  pct: 8  },
  ];

  const kpis = [
    { label: "Avg. Invoice Value", value: "TND 655",  trend: "+7.2%" },
    { label: "Processing Time",    value: "1.4 days", trend: "-18%"  },
    { label: "Approval Rate",      value: "96.4%",    trend: "+2.1%" },
    { label: "Active Suppliers",   value: "28",       trend: "+4"    },
  ];

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", padding: "80px 28px 40px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* En-tête */}
        <div className="fe1" style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Analytics Overview</p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 30, fontWeight: 800, color: "#e8f0ff", marginBottom: 6, letterSpacing: "-0.3px" }}>
            Invoice <span style={{ color: "#3b82f6" }}>Dashboard</span>
          </h1>
          <p style={{ color: "#5a6e99", fontSize: 14, fontWeight: 300 }}>Real-time analytics for your automotive invoice operations.</p>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="fe2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 28 }}>
          {kpis.map((k, i) => (
            <div key={i} className="surface-card" style={{ padding: "20px 22px" }}>
              <p style={{ fontSize: 11, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 700, color: "#e8f0ff", marginBottom: 4, animation: `counter-up 0.7s ease ${i * 0.1}s both` }}>{k.value}</p>
              <p style={{ fontSize: 11, color: "#10b981", fontWeight: 500 }}>{k.trend} vs last month</p>
            </div>
          ))}
        </div>

        {/* ── Graphiques barres + ligne ─────────────────────────────────────── */}
        <div className="fe3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

          {/* Volume de factures */}
          <div className="surface-card" style={{ padding: "24px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Invoice Volume</p>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 700, color: "#e8f0ff" }}>1,284</p>
                <p style={{ fontSize: 11, color: "#10b981", fontWeight: 500 }}>+12% this year</p>
              </div>
              <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.22)", fontWeight: 500 }}>↑ Trending</span>
            </div>
            <MiniBarChart data={invoiceData} color="#2563eb" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {months.map((m, i) => <span key={i} style={{ fontSize: 9, color: "#3a4d72", textAlign: "center", flex: 1 }}>{m}</span>)}
            </div>
          </div>

          {/* Tendance des revenus */}
          <div className="surface-card" style={{ padding: "24px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Revenue Trend</p>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 700, color: "#e8f0ff" }}>TND 842K</p>
                <p style={{ fontSize: 11, color: "#10b981", fontWeight: 500 }}>+19% this year</p>
              </div>
              <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.22)", fontWeight: 500 }}>12 months</span>
            </div>
            <MiniLineChart data={revenueData} color="#3b82f6" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {months.map((m, i) => <span key={i} style={{ fontSize: 9, color: "#3a4d72", textAlign: "center", flex: 1 }}>{m}</span>)}
            </div>
          </div>
        </div>

        {/* ── Donut statut + Top fournisseurs ──────────────────────────────── */}
        <div className="fe4" style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20 }}>

          {/* Donut Invoice Status */}
          <div className="surface-card" style={{ padding: "24px" }}>
            <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 20 }}>Invoice Status</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16"/>
                <circle cx="70" cy="70" r="54" fill="none" stroke="#2563eb" strokeWidth="16" strokeDasharray="339.3" strokeDashoffset="51" strokeLinecap="round" transform="rotate(-90 70 70)" style={{ animation: "dash-draw 1.5s ease forwards" }}/>
                <circle cx="70" cy="70" r="54" fill="none" stroke="#60a5fa" strokeWidth="16" strokeDasharray="50.9 339.3" strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 70 70)" opacity="0.8"/>
                <text x="70" y="66" textAnchor="middle" fill="#e8f0ff" fontSize="18" fontWeight="700" fontFamily="Syne,sans-serif">85%</text>
                <text x="70" y="82" textAnchor="middle" fill="#5a6e99" fontSize="10">Processed</text>
              </svg>
            </div>
            {[["Processed", "1,091", "#2563eb", "85%"], ["Pending", "193", "#60a5fa", "15%"]].map(([l, v, c, p], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: c }}/>
                  <span style={{ fontSize: 13, color: "#c0cfee" }}>{l}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, fontFamily: "'Syne',sans-serif", fontWeight: 600, color: "#e8f0ff" }}>{v}</span>
                  <span style={{ fontSize: 11, color: "#5a6e99" }}>{p}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Barres horizontales Top Suppliers */}
          <div className="surface-card" style={{ padding: "24px" }}>
            <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 20 }}>Top Suppliers</p>
            {suppliers.map((s, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#c0cfee" }}>{s.name}</span>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ fontSize: 12, color: "#5a6e99" }}>{s.invoices} inv.</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#e8f0ff", fontFamily: "'Syne',sans-serif" }}>{s.amount}</span>
                  </div>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#1d4ed8,#3b82f6)", width: `${s.pct}%`, animation: `bar-grow 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s both`, transformOrigin: "left" }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;