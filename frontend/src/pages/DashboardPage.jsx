// ─── src/pages/DashboardPage.jsx ─────────────────────────────────────────────
// RESPONSIVE — grilles adaptatives mobile/tablette/desktop

import { MiniBarChart, MiniLineChart } from "../components/Charts";

const DashboardPage = () => {
  const months      = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const invoiceData = [42,58,53,71,68,84,79,92,88,104,98,112];
  const revenueData = [38,52,47,65,70,81,74,90,85,99,94,108];

  const suppliers = [
    { name:"AutoParts Pro",      invoices:312, amount:"142K", pct:31 },
    { name:"MechaniX Tunisia",   invoices:248, amount:"98K",  pct:25 },
    { name:"CarTech Sfax",       invoices:201, amount:"84K",  pct:20 },
    { name:"VehicleParts Co.",   invoices:163, amount:"61K",  pct:16 },
    { name:"AutoShield Tunis",   invoices:90,  amount:"34K",  pct:8  },
  ];

  const kpis = [
    { label:"Facture moy.",     value:"TND 655",  trend:"+7.2%"  },
    { label:"Temps traitement", value:"1.4 jours",trend:"-18%"   },
    { label:"Taux approbation", value:"96.4%",    trend:"+2.1%"  },
    { label:"Fournisseurs",     value:"28",        trend:"+4"    },
  ];

  return (
    <div style={{ minHeight:"100vh", padding:"var(--page-pt) var(--page-px) 48px",
                  position:"relative", zIndex:1 }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* En-tête */}
        <div className="fe1" style={{ marginBottom:24 }}>
          <p style={{ fontSize:11, color:"#5a6e99", letterSpacing:"0.08em",
                      textTransform:"uppercase", marginBottom:6 }}>Analytics</p>
          <h1 className="page-title" style={{ marginBottom:6 }}>
            Invoice <span style={{color:"#3b82f6"}}>Dashboard</span>
          </h1>
          <p style={{ color:"#5a6e99", fontSize:14, fontWeight:300 }}>
            Analytiques en temps réel de vos opérations de facturation.
          </p>
        </div>

        {/* KPIs — 2×2 mobile, 4 desktop */}
        <div className="fe2 grid-4" style={{ marginBottom:20 }}>
          {kpis.map((k, i) => (
            <div key={i} className="surface-card" style={{ padding:"16px 18px" }}>
              <p style={{ fontSize:10, color:"#5a6e99", textTransform:"uppercase",
                          letterSpacing:"0.06em", marginBottom:6 }}>{k.label}</p>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700,
                          color:"#e8f0ff", marginBottom:4,
                          animation:`counter-up 0.7s ease ${i*0.1}s both` }}>
                {k.value}
              </p>
              <p style={{ fontSize:11, color:"#10b981", fontWeight:500 }}>{k.trend} vs mois préc.</p>
            </div>
          ))}
        </div>

        {/* Graphiques — 1 col mobile, 2 col desktop */}
        <div className="fe3 dash-grid-charts" style={{ marginBottom:20 }}>

          <div className="surface-card" style={{ padding:"20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                          marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <div>
                <p style={{ fontSize:11, color:"#5a6e99", textTransform:"uppercase",
                            letterSpacing:"0.05em", marginBottom:3 }}>Volume de factures</p>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700, color:"#e8f0ff" }}>1 284</p>
                <p style={{ fontSize:11, color:"#10b981", fontWeight:500 }}>+12% cette année</p>
              </div>
              <span className="badge badge-green">↑ En hausse</span>
            </div>
            <MiniBarChart data={invoiceData} color="#2563eb" />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
              {months.map((m, i) => (
                <span key={i} style={{ fontSize:9, color:"#3a4d72", textAlign:"center", flex:1 }}>{m}</span>
              ))}
            </div>
          </div>

          <div className="surface-card" style={{ padding:"20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                          marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <div>
                <p style={{ fontSize:11, color:"#5a6e99", textTransform:"uppercase",
                            letterSpacing:"0.05em", marginBottom:3 }}>Tendance des revenus</p>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700, color:"#e8f0ff" }}>TND 842K</p>
                <p style={{ fontSize:11, color:"#10b981", fontWeight:500 }}>+19% cette année</p>
              </div>
              <span className="badge badge-blue">12 mois</span>
            </div>
            <MiniLineChart data={revenueData} color="#3b82f6" />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
              {months.map((m, i) => (
                <span key={i} style={{ fontSize:9, color:"#3a4d72", textAlign:"center", flex:1 }}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Donut + Fournisseurs — 1 col mobile, 2 col desktop */}
        <div className="fe4 dash-grid-bottom">

          {/* Donut */}
          <div className="surface-card" style={{ padding:"20px" }}>
            <p style={{ fontSize:11, color:"#5a6e99", textTransform:"uppercase",
                        letterSpacing:"0.05em", marginBottom:16 }}>
              Statut des factures
            </p>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
              <svg width="120" height="120" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16"/>
                <circle cx="70" cy="70" r="54" fill="none" stroke="#2563eb" strokeWidth="16"
                        strokeDasharray="339.3" strokeDashoffset="51" strokeLinecap="round"
                        transform="rotate(-90 70 70)"
                        style={{ animation:"dash-draw 1.5s ease forwards" }}/>
                <circle cx="70" cy="70" r="54" fill="none" stroke="#60a5fa" strokeWidth="16"
                        strokeDasharray="50.9 339.3" strokeDashoffset="0" strokeLinecap="round"
                        transform="rotate(-90 70 70)" opacity="0.8"/>
                <text x="70" y="66" textAnchor="middle" fill="#e8f0ff" fontSize="18"
                      fontWeight="700" fontFamily="Syne,sans-serif">85%</text>
                <text x="70" y="82" textAnchor="middle" fill="#5a6e99" fontSize="10">Traitées</text>
              </svg>
            </div>
            {[["Traitées","1 091","#2563eb","85%"],["En attente","193","#60a5fa","15%"]].map(([l,v,c,p],i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                                    padding:"10px 0", borderTop:i>0?"1px solid rgba(255,255,255,0.05)":undefined }}>
                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                  <div style={{ width:9, height:9, borderRadius:2, background:c, flexShrink:0 }} />
                  <span style={{ fontSize:13, color:"#c0cfee" }}>{l}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"#e8f0ff" }}>{v}</span>
                  <span style={{ fontSize:11, color:"#5a6e99" }}>{p}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Top fournisseurs */}
          <div className="surface-card" style={{ padding:"20px" }}>
            <p style={{ fontSize:11, color:"#5a6e99", textTransform:"uppercase",
                        letterSpacing:"0.05em", marginBottom:16 }}>
              Top Fournisseurs
            </p>
            {suppliers.map((s, i) => (
              <div key={i} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5,
                              flexWrap:"wrap", gap:4 }}>
                  <span className="truncate" style={{ fontSize:13, color:"#c0cfee", maxWidth:"55%" }}>{s.name}</span>
                  <div style={{ display:"flex", gap:10, flexShrink:0 }}>
                    <span style={{ fontSize:11, color:"#5a6e99" }}>{s.invoices}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:"#e8f0ff",
                                   fontFamily:"'Syne',sans-serif" }}>
                      TND {s.amount}
                    </span>
                  </div>
                </div>
                <div style={{ height:5, borderRadius:3, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                  <div style={{
                    height:"100%", borderRadius:3,
                    background:"linear-gradient(90deg,#1d4ed8,#3b82f6)",
                    width:`${s.pct}%`,
                    animation:`bar-grow 0.9s cubic-bezier(0.22,1,0.36,1) ${i*0.1}s both`,
                    transformOrigin:"left",
                  }} />
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