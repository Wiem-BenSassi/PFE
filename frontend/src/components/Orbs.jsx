// ─── src/components/Orbs.jsx ─────────────────────────────────────────────────
// Deux cercles lumineux flottants (haut-gauche et bas-droite).
// Purement décoratif — crée l'ambiance "glow" bleue de l'application.

const Orbs = () => (
  <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
    {/* Orbe haut-gauche */}
    <div style={{
      position: "absolute", width: 650, height: 650, borderRadius: "50%",
      background: "radial-gradient(circle,rgba(29,78,216,0.13) 0%,transparent 70%)",
      top: "-180px", left: "-180px",
      animation: "float-orb 13s ease-in-out infinite",
    }} />
    {/* Orbe bas-droite */}
    <div style={{
      position: "absolute", width: 520, height: 520, borderRadius: "50%",
      background: "radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 70%)",
      bottom: "-110px", right: "-110px",
      animation: "float-orb 17s ease-in-out infinite reverse",
    }} />
  </div>
);

export default Orbs;