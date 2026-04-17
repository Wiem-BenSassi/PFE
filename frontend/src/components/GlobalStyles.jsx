// ─── src/components/GlobalStyles.jsx ─────────────────────────────────────────
// RESPONSIVE COMPLET — mobile-first, tous les breakpoints, touch-friendly

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
      --warn: #f59e0b;
      --warn2: #f97316;

      /* ── Layout ── */
      --nav-h: 60px;
      --page-px: clamp(12px, 4vw, 32px);
      --page-pt: calc(var(--nav-h) + 28px);
      --card-pad: clamp(14px, 3vw, 28px);
      --radius-card: clamp(14px, 2vw, 20px);
      --radius-btn: 12px;
      --gap: clamp(10px, 2vw, 20px);

      /* ── Touch ── */
      --touch-min: 48px;
    }

    @media (max-width: 480px) {
      :root {
        --nav-h: 56px;
        --radius-card: 14px;
        --radius-btn: 10px;
      }
    }

    html, body { height: 100%; overflow-x: hidden; scroll-behavior: smooth; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      /* safe-area for notched phones */
      padding-bottom: env(safe-area-inset-bottom);
    }

    /* ── Scrollbar ────────────────────────────────────────────────────────── */
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(37,99,235,0.35); border-radius: 4px; }

    /* ── Touch targets ────────────────────────────────────────────────────── */
    button, a, [role="button"], label { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
    /* Prevent iOS zoom on input focus */
    input, select, textarea { font-size: 16px !important; }

    /* ── Animations ──────────────────────────────────────────────────────── */
    @keyframes float-orb {
      0%,100% { transform: translate(0,0) scale(1); }
      33%      { transform: translate(30px,-20px) scale(1.05); }
      66%      { transform: translate(-20px,15px) scale(0.97); }
    }
    @keyframes slide-up {
      from { opacity:0; transform:translateY(24px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes slide-in-right {
      from { opacity:0; transform:translateX(40px); }
      to   { opacity:1; transform:translateX(0); }
    }
    @keyframes slide-in-bottom {
      from { opacity:0; transform:translateY(40px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes fade-in { from { opacity:0; } to { opacity:1; } }
    @keyframes spin-ring { to { transform:rotate(360deg); } }
    @keyframes check-draw { from { stroke-dashoffset:30; } to { stroke-dashoffset:0; } }
    @keyframes shake {
      0%,100% { transform:translateX(0) }
      20%     { transform:translateX(-6px) }
      40%     { transform:translateX(6px)  }
      60%     { transform:translateX(-4px) }
      80%     { transform:translateX(4px)  }
    }
    @keyframes bar-grow    { from { transform:scaleY(0); } to { transform:scaleY(1); } }
    @keyframes bar-grow-x  { from { width:0; } to { } }
    @keyframes counter-up  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes dash-draw   { from { stroke-dashoffset:300; } to { stroke-dashoffset:0; } }
    @keyframes page-enter  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes hamburger-in { from { opacity:0; transform:scale(0.95) translateY(-8px); } to { opacity:1; transform:scale(1) translateY(0); } }
    @keyframes login-card-enter { from { opacity:0; transform:translateY(40px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes login-logo-drop  { from { opacity:0; transform:translateY(-28px) scale(0.9); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes login-field-enter{ from { opacity:0; transform:translateX(-18px); } to { opacity:1; transform:translateX(0); } }
    @keyframes pulse-badge { 0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,0.4)} 50%{box-shadow:0 0 0 6px rgba(37,99,235,0)} }

    /* ── Utility animation classes ──────────────────────────────────────── */
    .card-enter { animation: login-card-enter 0.8s cubic-bezier(0.22,1,0.36,1) both; }
    .page-enter { animation: page-enter       0.5s cubic-bezier(0.22,1,0.36,1) both; }
    .fe1 { animation: slide-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
    .fe2 { animation: slide-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.16s both; }
    .fe3 { animation: slide-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.24s both; }
    .fe4 { animation: slide-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.32s both; }
    .fe5 { animation: slide-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.40s both; }
    .fe6 { animation: slide-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.48s both; }
    .lfe1 { animation: login-logo-drop   0.7s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
    .lfe2 { animation: login-field-enter 0.6s cubic-bezier(0.22,1,0.36,1) 0.28s both; }
    .lfe3 { animation: login-field-enter 0.6s cubic-bezier(0.22,1,0.36,1) 0.40s both; }
    .lfe4 { animation: login-field-enter 0.6s cubic-bezier(0.22,1,0.36,1) 0.52s both; }
    .lfe5 { animation: slide-up          0.6s cubic-bezier(0.22,1,0.36,1) 0.64s both; }

    /* ── Page title ───────────────────────────────────────────────────────── */
    .page-title {
      font-family: 'Syne', sans-serif;
      font-size: clamp(22px, 5vw, 34px);
      font-weight: 800;
      color: #e8f0ff;
      letter-spacing: -0.4px;
      line-height: 1.15;
    }

    /* ── Buttons ─────────────────────────────────────────────────────────── */
    .btn-primary {
      background: linear-gradient(135deg,#1d4ed8 0%,#2563eb 55%,#3b82f6 100%);
      border: none; color: white; cursor: pointer;
      font-family: 'Syne', sans-serif; font-weight: 600;
      border-radius: var(--radius-btn);
      transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
      box-shadow: 0 6px 22px rgba(37,99,235,0.42);
      min-height: var(--touch-min);
      padding: 0 20px;
      white-space: nowrap;
    }
    .btn-primary:hover:not(:disabled)  { transform:translateY(-2px); box-shadow:0 12px 32px rgba(37,99,235,0.58); }
    .btn-primary:active:not(:disabled) { transform:translateY(0) scale(0.98); }
    .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }

    .btn-ghost {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.09);
      color: #c0cfee; cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      font-weight: 400; border-radius: var(--radius-btn);
      transition: background 0.2s, border-color 0.2s, color 0.2s;
      min-height: 40px;
      padding: 0 14px;
    }
    .btn-ghost:hover { background:rgba(37,99,235,0.1); border-color:rgba(37,99,235,0.3); color:#e8f0ff; }

    .btn-icon {
      width: var(--touch-min); height: var(--touch-min);
      border-radius: 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      color: #5a6e99; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; flex-shrink: 0;
    }
    .btn-icon:hover { background:rgba(37,99,235,0.1); border-color:rgba(37,99,235,0.3); color:#e8f0ff; }

    /* ── Cards ────────────────────────────────────────────────────────────── */
    .surface-card {
      background: linear-gradient(145deg,#0d1627 0%,#0a1120 100%);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: var(--radius-card);
      box-shadow: 0 6px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
      position: relative; overflow: hidden;
    }

    /* ── Badge ────────────────────────────────────────────────────────────── */
    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 600; padding: 3px 10px;
      border-radius: 20px; white-space: nowrap;
    }
    .badge-blue   { background:rgba(37,99,235,0.12);  color:#60a5fa; border:1px solid rgba(37,99,235,0.25); }
    .badge-green  { background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.25); }
    .badge-amber  { background:rgba(245,158,11,0.12); color:#f59e0b; border:1px solid rgba(245,158,11,0.25); }
    .badge-orange { background:rgba(249,115,22,0.12); color:#f97316; border:1px solid rgba(249,115,22,0.3); }
    .badge-red    { background:rgba(248,113,113,0.12);color:#f87171; border:1px solid rgba(248,113,113,0.3); }

    /* ── Form inputs ──────────────────────────────────────────────────────── */
    .form-input {
      width: 100%; padding: 14px 14px 14px 42px;
      background: transparent; border: none; outline: none;
      color: #e8f0ff; font-family: 'DM Sans', sans-serif;
      border-radius: var(--radius-btn);
    }
    .form-input::placeholder { color: #3a4d72; }

    /* ── Nav links ────────────────────────────────────────────────────────── */
    .nav-link {
      font-size: 13px; color: #5a6e99; cursor: pointer;
      padding: 8px 12px; border-radius: 9px;
      transition: all 0.2s; font-family: 'DM Sans', sans-serif;
      border: none; background: none;
      min-height: 36px; display: inline-flex; align-items: center; gap: 6px;
      white-space: nowrap;
    }
    .nav-link:hover  { color:#e8f0ff; background:rgba(37,99,235,0.1); }
    .nav-link.active { color:#e8f0ff; background:rgba(37,99,235,0.15); font-weight:500; }

    .nav-link-mobile {
      display: flex; align-items: center; gap: 12px;
      width: 100%; padding: 13px 16px; border-radius: 12px;
      font-size: 15px; color: #c0cfee;
      cursor: pointer; border: none; background: none;
      font-family: 'DM Sans', sans-serif; transition: all 0.15s;
      text-align: left; min-height: var(--touch-min);
    }
    .nav-link-mobile:hover  { background:rgba(37,99,235,0.1); color:#e8f0ff; }
    .nav-link-mobile.active { background:rgba(37,99,235,0.16); color:#e8f0ff; font-weight:500; }

    /* ── Responsive grids ────────────────────────────────────────────────── */
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:var(--gap); }
    .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--gap); }
    .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--gap); }
    .grid-auto-200 { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:var(--gap); }
    .grid-auto-260 { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:var(--gap); }

    /* Tablette */
    @media (max-width: 900px) {
      .grid-4 { grid-template-columns:1fr 1fr; }
      .grid-3 { grid-template-columns:1fr 1fr; }
    }
    /* Mobile large */
    @media (max-width: 640px) {
      .grid-2 { grid-template-columns:1fr; gap:12px; }
      .grid-3 { grid-template-columns:1fr; gap:12px; }
      .grid-4 { grid-template-columns:1fr 1fr; gap:10px; }
    }
    /* Mobile small */
    @media (max-width: 380px) {
      .grid-4 { grid-template-columns:1fr; }
    }

    /* ── Mobile list items ───────────────────────────────────────────────── */
    .mobile-list-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      transition: background 0.15s;
    }
    .mobile-list-item:last-child { border-bottom: none; }
    .mobile-list-item:active { background: rgba(255,255,255,0.03); }

    /* ── Upload type cards ───────────────────────────────────────────────── */
    .upload-type-card {
      padding: clamp(14px, 3vw, 22px);
      border-radius: var(--radius-card);
      cursor: pointer; transition: all 0.25s;
      border: 1px solid rgba(255,255,255,0.07);
      background: linear-gradient(145deg,#0d1627,#0a1120);
      min-height: var(--touch-min);
      -webkit-tap-highlight-color: transparent;
    }
    .upload-type-card:active { transform: scale(0.98); }

    /* ── Dropzone ────────────────────────────────────────────────────────── */
    .dropzone {
      border: 2px dashed rgba(37,99,235,0.28);
      border-radius: var(--radius-card);
      text-align: center;
      padding: clamp(28px, 6vw, 56px) clamp(16px, 4vw, 40px);
      cursor: pointer; transition: all 0.3s;
      background: rgba(37,99,235,0.02);
    }
    .dropzone:hover, .dropzone.dragging {
      border-color: rgba(37,99,235,0.65);
      background: rgba(37,99,235,0.06);
    }
    .dropzone:active { transform: scale(0.99); }

    /* ── Action buttons row (mobile-optimized) ──────────────────────────── */
    .action-row {
      display: flex; gap: 10px; flex-wrap: wrap;
    }
    .action-row .btn-primary, .action-row .btn-ghost {
      flex: 1 1 120px;
    }
    @media (max-width: 400px) {
      .action-row { flex-direction: column; }
      .action-row .btn-primary, .action-row .btn-ghost { flex: none; width: 100%; }
    }

    /* ── Overflow helpers ────────────────────────────────────────────────── */
    .truncate { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

    /* ── Loading shimmer ─────────────────────────────────────────────────── */
    @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
    .shimmer {
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }

    /* ── Archive table → card on mobile ─────────────────────────────────── */
    .archive-table-header { display:grid; }
    .archive-table-row    { display:grid; }
    @media (max-width:700px) {
      .archive-table-header { display:none !important; }
      .archive-table-row {
        display:flex !important; flex-direction:column;
        gap:8px; padding:16px !important;
      }
    }

    /* ── Toast ────────────────────────────────────────────────────────────── */
    .toast-wrap {
      position:fixed; bottom:24px; right:24px; z-index:9999;
      max-width: calc(100vw - 32px);
    }
    @media (max-width:480px) {
      .toast-wrap {
        bottom:0; right:0; left:0;
        max-width:100%;
        padding:0 0 env(safe-area-inset-bottom);
      }
    }

    /* ── Tip card grid ───────────────────────────────────────────────────── */
    .tip-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px;
    }
    @media (max-width:480px) {
      .tip-grid { grid-template-columns:1fr; }
    }

    /* ── Stat card value ─────────────────────────────────────────────────── */
    .stat-value {
      font-family:'Syne',sans-serif;
      font-size: clamp(17px, 4vw, 22px);
      font-weight:700; color:#e8f0ff; line-height:1;
    }

    /* ── Dashboard grid ──────────────────────────────────────────────────── */
    .dash-grid-charts {
      display:grid; grid-template-columns:1fr 1fr; gap:var(--gap);
    }
    .dash-grid-bottom {
      display:grid; grid-template-columns:1fr 1.6fr; gap:var(--gap);
    }
    @media (max-width:768px) {
      .dash-grid-charts { grid-template-columns:1fr; }
      .dash-grid-bottom  { grid-template-columns:1fr; }
    }
  `}</style>
);

export default GlobalStyles;