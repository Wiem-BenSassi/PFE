// ─── src/components/GlobalStyles.jsx ─────────────────────────────────────────
// Injecte toutes les variables CSS, animations et classes utilitaires globales.
// Importé une seule fois dans le composant racine (VerniColorApp.jsx).

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #060a14;
      --surface: #0c1221;
      --surface2: #101828;
      --border: rgba(255,255,255,0.07);
      --border-focus: rgba(37,99,235,0.55);
      --text: #e8f0ff;
      --muted: #5a6e99;
      --accent: #2563eb;
      --accent2: #3b82f6;
      --accent-glow: rgba(37,99,235,0.28);
      --success: #10b981;
      --error: #f87171;
    }
    html, body { height: 100%; overflow-x: hidden; }
    body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #060a14; }
    ::-webkit-scrollbar-thumb { background: rgba(37,99,235,0.35); border-radius: 3px; }

    @keyframes float-orb {
      0%,100% { transform: translate(0,0) scale(1); }
      33% { transform: translate(30px,-20px) scale(1.05); }
      66% { transform: translate(-20px,15px) scale(0.97); }
    }
    @keyframes slide-up {
      from { opacity:0; transform:translateY(36px); }
      to { opacity:1; transform:translateY(0); }
    }
    @keyframes slide-in-right {
      from { opacity:0; transform:translateX(40px); }
      to { opacity:1; transform:translateX(0); }
    }
    @keyframes fade-in {
      from { opacity:0; }
      to { opacity:1; }
    }
    @keyframes spin-ring {
      to { transform:rotate(360deg); }
    }
    @keyframes check-draw {
      from { stroke-dashoffset:30; }
      to { stroke-dashoffset:0; }
    }
    @keyframes shake {
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-6px)}
      40%{transform:translateX(6px)}
      60%{transform:translateX(-4px)}
      80%{transform:translateX(4px)}
    }
    @keyframes pulse-glow {
      0%,100% { box-shadow: 0 0 20px rgba(37,99,235,0.22); }
      50% { box-shadow: 0 0 48px rgba(37,99,235,0.5); }
    }
    @keyframes bar-grow {
      from { transform: scaleY(0); }
      to { transform: scaleY(1); }
    }
    @keyframes counter-up {
      from { opacity:0; transform: translateY(10px); }
      to { opacity:1; transform: translateY(0); }
    }
    @keyframes dash-draw {
      from { stroke-dashoffset: 300; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes page-enter {
      from { opacity:0; transform:translateY(20px); }
      to { opacity:1; transform:translateY(0); }
    }
    @keyframes login-card-enter {
      from { opacity:0; transform:translateY(48px) scale(0.97); }
      to { opacity:1; transform:translateY(0) scale(1); }
    }
    @keyframes login-logo-drop {
      from { opacity:0; transform:translateY(-28px) scale(0.9); }
      to { opacity:1; transform:translateY(0) scale(1); }
    }
    @keyframes login-field-enter {
      from { opacity:0; transform:translateX(-18px); }
      to { opacity:1; transform:translateX(0); }
    }

    .card-enter { animation: login-card-enter 0.85s cubic-bezier(0.22,1,0.36,1) both; }
    .page-enter { animation: page-enter 0.55s cubic-bezier(0.22,1,0.36,1) both; }
    .fe1 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.10s both; }
    .fe2 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.20s both; }
    .fe3 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.30s both; }
    .fe4 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.40s both; }
    .fe5 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.50s both; }
    .fe6 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.60s both; }

    .lfe1 { animation: login-logo-drop 0.75s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
    .lfe2 { animation: login-field-enter 0.65s cubic-bezier(0.22,1,0.36,1) 0.30s both; }
    .lfe3 { animation: login-field-enter 0.65s cubic-bezier(0.22,1,0.36,1) 0.42s both; }
    .lfe4 { animation: login-field-enter 0.65s cubic-bezier(0.22,1,0.36,1) 0.54s both; }
    .lfe5 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.66s both; }

    .btn-primary {
      background: linear-gradient(135deg,#1d4ed8 0%,#2563eb 50%,#3b82f6 100%);
      border: none; color: white; cursor: pointer;
      font-family: 'Syne', sans-serif; font-weight: 600; border-radius: 12px;
      transition: all 0.3s; box-shadow: 0 8px 28px rgba(37,99,235,0.45);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(37,99,235,0.6); }
    .btn-primary:active { transform: translateY(0) scale(0.99); }

    .btn-ghost {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
      color: #c0cfee; cursor: pointer; font-family: 'DM Sans', sans-serif;
      font-weight: 400; border-radius: 10px; transition: all 0.25s;
    }
    .btn-ghost:hover { background: rgba(37,99,235,0.1); border-color: rgba(37,99,235,0.3); color: #e8f0ff; }

    .surface-card {
      background: linear-gradient(145deg,#0d1627 0%,#0a1120 100%);
      border: 1px solid rgba(255,255,255,0.07); border-radius: 20px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05);
    }

    .nav-link {
      font-size: 13px; color: #5a6e99; cursor: pointer; padding: 8px 14px;
      border-radius: 8px; transition: all 0.25s; font-family: 'DM Sans', sans-serif;
      border: none; background: none;
    }
    .nav-link:hover { color: #e8f0ff; background: rgba(37,99,235,0.1); }
    .nav-link.active { color: #e8f0ff; background: rgba(37,99,235,0.14); }
  `}</style>
);

export default GlobalStyles;