// ─── src/components/Charts.jsx ───────────────────────────────────────────────
// Composants graphiques légers utilisés dans la page Dashboard.
// Aucune dépendance externe — SVG pur.

// ── Graphique à barres verticales ─────────────────────────────────────────────
// data  : tableau de nombres
// color : couleur hexadécimale des barres (ex: "#2563eb")
export const MiniBarChart = ({ data, color }) => {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 80 }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}
        >
          {/* Hauteur calculée en % par rapport à la valeur max */}
          <div style={{
            width: "100%", borderRadius: "4px 4px 0 0",
            background: `linear-gradient(180deg,${color} 0%,${color}88 100%)`,
            height: `${(v / max) * 100}%`,
            transformOrigin: "bottom",
            animation: `bar-grow 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 0.06}s both`,
          }} />
        </div>
      ))}
    </div>
  );
};

// ── Graphique linéaire avec aire remplie ──────────────────────────────────────
// data  : tableau de nombres
// color : couleur de la ligne et du dégradé (ex: "#3b82f6")
export const MiniLineChart = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 200, h = 60, pad = 4;

  // Calcul des coordonnées SVG pour chaque point
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  const fill = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return `${x},${y}`;
  });
  const fillPath = `M${fill[0]} L${fill.slice(1).join(" L")} L${w - pad},${h - pad} L${pad},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 60, overflow: "visible" }}>
      <defs>
        <linearGradient id={`lg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Aire remplie sous la courbe */}
      <path d={fillPath} fill={`url(#lg-${color.replace("#", "")})`}/>
      {/* Ligne de la courbe avec animation */}
      <polyline
        points={pts}
        fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="300"
        style={{ animation: "dash-draw 1.3s ease forwards" }}
      />
    </svg>
  );
};