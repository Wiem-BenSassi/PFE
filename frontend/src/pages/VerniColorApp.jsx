import { useState, useEffect, useRef, useCallback } from "react";
import { loginUser } from "../services/Api"

// ─── STYLES GLOBAUX ──────────────────────────────────────────────────────────
// Toutes les variables CSS, animations, et classes réutilisables de l'app
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

    /* Classes d'animation avec délais échelonnés — fe = "field enter" */
    .card-enter { animation: login-card-enter 0.85s cubic-bezier(0.22,1,0.36,1) both; }
    .page-enter { animation: page-enter 0.55s cubic-bezier(0.22,1,0.36,1) both; }
    .fe1 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.10s both; }
    .fe2 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.20s both; }
    .fe3 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.30s both; }
    .fe4 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.40s both; }
    .fe5 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.50s both; }
    .fe6 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.60s both; }

    /* Animations spécifiques à la page de login */
    .lfe1 { animation: login-logo-drop 0.75s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
    .lfe2 { animation: login-field-enter 0.65s cubic-bezier(0.22,1,0.36,1) 0.30s both; }
    .lfe3 { animation: login-field-enter 0.65s cubic-bezier(0.22,1,0.36,1) 0.42s both; }
    .lfe4 { animation: login-field-enter 0.65s cubic-bezier(0.22,1,0.36,1) 0.54s both; }
    .lfe5 { animation: slide-up 0.65s cubic-bezier(0.22,1,0.36,1) 0.66s both; }

    /* Bouton principal bleu avec dégradé */
    .btn-primary {
      background: linear-gradient(135deg,#1d4ed8 0%,#2563eb 50%,#3b82f6 100%);
      border: none; color: white; cursor: pointer;
      font-family: 'Syne', sans-serif; font-weight: 600; border-radius: 12px;
      transition: all 0.3s; box-shadow: 0 8px 28px rgba(37,99,235,0.45);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(37,99,235,0.6); }
    .btn-primary:active { transform: translateY(0) scale(0.99); }

    /* Bouton secondaire transparent */
    .btn-ghost {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
      color: #c0cfee; cursor: pointer; font-family: 'DM Sans', sans-serif;
      font-weight: 400; border-radius: 10px; transition: all 0.25s;
    }
    .btn-ghost:hover { background: rgba(37,99,235,0.1); border-color: rgba(37,99,235,0.3); color: #e8f0ff; }

    /* Carte sombre avec bordure subtile — utilisée partout dans l'app */
    .surface-card {
      background: linear-gradient(145deg,#0d1627 0%,#0a1120 100%);
      border: 1px solid rgba(255,255,255,0.07); border-radius: 20px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05);
    }

    /* Lien de navigation dans la barre du haut */
    .nav-link {
      font-size: 13px; color: #5a6e99; cursor: pointer; padding: 8px 14px;
      border-radius: 8px; transition: all 0.25s; font-family: 'DM Sans', sans-serif;
      border: none; background: none;
    }
    .nav-link:hover { color: #e8f0ff; background: rgba(37,99,235,0.1); }
    .nav-link.active { color: #e8f0ff; background: rgba(37,99,235,0.14); }
  `}</style>
);

// ─── FOND ANIMÉ (CANVAS) ─────────────────────────────────────────────────────
// Dessine une grille + des particules bleues qui bougent et se connectent
const Background = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    // Redimensionne le canvas quand la fenêtre change de taille
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    // Création de 55 particules avec position et vitesse aléatoires
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.3, alpha: Math.random() * 0.35 + 0.08,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dessin de la grille de fond
      ctx.strokeStyle = "rgba(255,255,255,0.02)"; ctx.lineWidth = 1;
      const step = 80;
      for (let x = 0; x < canvas.width; x += step) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
      for (let y = 0; y < canvas.height; y += step) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }

      // Mise à jour et dessin de chaque particule
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        // Les particules rebondissent de l'autre côté quand elles sortent de l'écran
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(37,99,235,${p.alpha})`; ctx.fill();
      });

      // Dessin des lignes entre particules proches (moins de 110px)
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 110) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(37,99,235,${0.07 * (1 - d / 110)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    // Nettoyage : on arrête l'animation quand le composant est démonté
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
};

// ─── ORBES AMBIANTS ──────────────────────────────────────────────────────────
// Deux cercles lumineux flottants en haut-gauche et bas-droite pour l'ambiance
const Orbs = () => (
  <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
    <div style={{ position:"absolute", width:650, height:650, borderRadius:"50%", background:"radial-gradient(circle,rgba(29,78,216,0.13) 0%,transparent 70%)", top:"-180px", left:"-180px", animation:"float-orb 13s ease-in-out infinite" }}/>
    <div style={{ position:"absolute", width:520, height:520, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 70%)", bottom:"-110px", right:"-110px", animation:"float-orb 17s ease-in-out infinite reverse" }}/>
  </div>
);

// ─── BADGE COIN HAUT-GAUCHE ──────────────────────────────────────────────────
// Logo VerniColor affiché en haut à gauche quand l'utilisateur est connecté
const CornerBadge = () => (
  <div style={{ position:"fixed", top:20, left:20, zIndex:100, display:"flex", alignItems:"center", gap:10, background:"rgba(6,10,20,0.88)", backdropFilter:"blur(14px)", border:"1px solid rgba(37,99,235,0.28)", borderRadius:14, padding:"8px 14px", boxShadow:"0 4px 20px rgba(0,0,0,0.45)", animation:"fade-in 1s ease 0.4s both" }}>
    <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <AutomotiveIcon size={16} color="white" />
    </div>
    <div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, lineHeight:1.1, color:"#e8f0ff" }}>
        <span style={{ color:"#3b82f6" }}>Verni</span>Color
      </div>
      <div style={{ fontSize:9, fontWeight:500, letterSpacing:"0.15em", color:"#3a4d72", textTransform:"uppercase" }}>Tunisia</div>
    </div>
  </div>
);

// ─── ICÔNE VOLANT DE VOITURE ─────────────────────────────────────────────────
// SVG d'un volant — icône principale de la marque VerniColor
const AutomotiveIcon = ({ size = 30, color = "white" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="13" stroke={color} strokeWidth="2.2" fill="none" opacity="0.95"/>
    <circle cx="16" cy="16" r="3.5" stroke={color} strokeWidth="2" fill="none"/>
    <line x1="16" y1="12.5" x2="16" y2="3.2" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="19.2" y1="18.4" x2="27.5" y2="23.2" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="12.8" y1="18.4" x2="4.5" y2="23.2" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

// ─── SPINNER DE CHARGEMENT ───────────────────────────────────────────────────
// Cercle qui tourne — affiché pendant les requêtes API (login, upload, etc.)
const Spinner = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" style={{ animation:"spin-ring 0.8s linear infinite" }}>
    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5"/>
    <path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

// ─── ICÔNE ŒIL (afficher/masquer mot de passe) ───────────────────────────────
// open=true → œil ouvert (mot de passe visible), open=false → œil barré (masqué)
const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>) : (<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>)}
  </svg>
);

// ─── BARRE DE NAVIGATION DU HAUT ─────────────────────────────────────────────
// Visible uniquement quand l'utilisateur est connecté (pas sur la page login)
// Contient : logo, liens de navigation, avatar utilisateur, bouton logout
const TopNav = ({ page, setPage, user = "Admin", onLogout }) => (
  <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, height:60, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px", background:"rgba(6,10,20,0.88)", backdropFilter:"blur(18px)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
    {/* Logo cliquable — ramène à la page d'accueil */}
    <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={() => setPage("home")}>
      <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <AutomotiveIcon size={18} color="white" />
      </div>
      <span style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:"#e8f0ff" }}>
        <span style={{ color:"#3b82f6" }}>Verni</span>Color
      </span>
      <span style={{ fontSize:9, letterSpacing:"0.18em", color:"#3a4d72", textTransform:"uppercase", marginTop:2 }}>Tunisia</span>
    </div>

    {/* Liens de navigation — la page active est mise en surbrillance */}
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      <button className={`nav-link ${page==="home"?"active":""}`} onClick={() => setPage("home")}>Home</button>
      <button className={`nav-link ${page==="upload"?"active":""}`} onClick={() => setPage("upload")}>Invoices</button>
      <button className={`nav-link ${page==="dashboard"?"active":""}`} onClick={() => setPage("dashboard")}>Dashboard</button>
    </div>

    {/* Zone utilisateur : avatar avec initiale + nom + bouton déconnexion */}
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"white", fontFamily:"'Syne',sans-serif" }}>
        {user[0]}  {/* Première lettre du nom comme avatar */}
      </div>
      <span style={{ fontSize:13, color:"#5a6e99" }}>{user}</span>
      <button className="btn-ghost" onClick={onLogout} style={{ fontSize:12, padding:"6px 14px", display:"flex", alignItems:"center", gap:6, marginLeft:4 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Logout
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 : LOGIN
// Formulaire de connexion avec email + mot de passe
// Envoie les données au backend FastAPI et redirige si succès
// ═══════════════════════════════════════════════════════════════════════════════
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);       // afficher/masquer le mot de passe
  const [remember, setRemember] = useState(false);   // case "Remember me"
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [loading, setLoading] = useState(false);     // requête en cours
  const [success, setSuccess] = useState(false);     // login réussi
  const [error, setError] = useState("");            // message d'erreur à afficher
  const [shake, setShake] = useState(false);         // animation de secousse si erreur
  const [showResetModal, setShowResetModal] = useState(false); // modale "mot de passe oublié"

  // Déclenche l'animation de secousse pendant 500ms
  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  // Fonction appelée quand l'utilisateur soumet le formulaire
  const handleLogin = async (e) => {
    e.preventDefault();  // empêche le rechargement de la page

    // Validation basique : les deux champs doivent être remplis
    if (!email || !password) {
      setError("Please fill in all fields.");
      triggerShake();
      return;
    }

    try {
      setLoading(true);

      // Envoi de la requête POST au backend FastAPI
      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();
      console.log(data);

      if (response.ok) {
        // Login réussi → affiche l'animation de succès, puis redirige après 900ms
        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
          onLogin(data.username);  // passe le nom d'utilisateur au composant parent
        }, 900);
      } else {
        // Erreur renvoyée par le backend (mauvais mot de passe, etc.)
        setLoading(false);
        setError(data.detail || "Login failed");
        triggerShake();
      }

    } catch (error) {
      // Erreur réseau (backend éteint, pas de connexion, etc.)
      setLoading(false);
      setError("Server error");
    }
  };

  // Style dynamique des champs selon qu'ils sont focus ou non
  const inputWrap = (focused) => ({
    position:"relative", borderRadius:12,
    background: focused ? "rgba(37,99,235,0.07)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${focused ? "rgba(37,99,235,0.55)" : "rgba(255,255,255,0.08)"}`,
    transition:"all 0.3s",
    boxShadow: focused ? "0 0 0 4px rgba(37,99,235,0.12)" : "none",
  });

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px", position:"relative", zIndex:1 }}>

      {/* Modale "mot de passe oublié" — s'affiche par-dessus le formulaire */}
      {showResetModal && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.65)", backdropFilter:"blur(7px)", animation:"fade-in 0.25s ease" }} onClick={() => setShowResetModal(false)}>
          <div style={{ background:"linear-gradient(145deg,#0d1627,#0a1120)", border:"1px solid rgba(37,99,235,0.35)", borderRadius:20, padding:"32px 36px", maxWidth:360, width:"90%", boxShadow:"0 24px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)", textAlign:"center", animation:"slide-up 0.35s cubic-bezier(0.22,1,0.36,1)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width:52, height:52, borderRadius:14, background:"rgba(37,99,235,0.12)", border:"1px solid rgba(37,99,235,0.28)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:"#e8f0ff", marginBottom:10 }}>Check your inbox</p>
            <p style={{ fontSize:14, color:"#5a6e99", fontWeight:300, lineHeight:1.6, marginBottom:24 }}>Password reset link sent to your email.</p>
            <button className="btn-primary" onClick={() => setShowResetModal(false)} style={{ padding:"10px 28px", fontSize:14 }}>Got it</button>
          </div>
        </div>
      )}

      {/* Carte principale du formulaire de login */}
      <div className="card-enter" style={{ width:"100%", maxWidth:420, background:"linear-gradient(145deg,#0d1627 0%,#0a1120 100%)", borderRadius:24, border:"1px solid rgba(255,255,255,0.08)", boxShadow:"0 36px 90px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)", padding:"40px 36px", position:"relative", overflow:"hidden", animation: shake ? "shake 0.5s ease" : undefined }}>

        {/* Ligne lumineuse décorative en haut de la carte */}
        <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"70%", height:1, background:"linear-gradient(90deg,transparent,rgba(37,99,235,0.6),transparent)", pointerEvents:"none" }}/>

        {/* En-tête avec logo et titre */}
        <div className="lfe1" style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ marginBottom:16, display:"flex", justifyContent:"center" }}>
            <div style={{ width:120, height:60, borderRadius:12, background:"rgba(37,99,235,0.08)", border:"1px solid rgba(37,99,235,0.2)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
              {/* Essaie de charger le vrai logo — affiche l'icône SVG si le fichier est absent */}
              <img
                src="/logo-vernicolor.png"
                alt="VerniColor Tunisia Logo"
                style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }}
                onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
              />
              <div style={{ display:"none", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}>
                <AutomotiveIcon size={26} color="#3b82f6" />
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:10, fontWeight:700, color:"#3b82f6", letterSpacing:"0.06em" }}>VERNICOLOR</span>
              </div>
            </div>
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, letterSpacing:"-0.3px", color:"#e8f0ff", marginBottom:2 }}>
            <span style={{ color:"#3b82f6" }}>Verni</span>Color
          </h1>
          <p style={{ fontSize:10, fontWeight:600, letterSpacing:"0.22em", color:"#3a4d72", textTransform:"uppercase", marginBottom:8 }}>Tunisia</p>
          <p style={{ color:"#3a4d72", fontSize:13, fontWeight:300 }}>Sign in to your account</p>
        </div>

        {/* Affiche soit l'animation de succès, soit le formulaire */}
        {success ? (
          // Écran de succès : coche verte + message de redirection
          <div style={{ textAlign:"center", padding:"24px 0", animation:"fade-in 0.5s ease" }}>
            <div style={{ marginBottom:16, display:"flex", justifyContent:"center" }}>
              <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><polyline points="5,12 10,17 19,7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" style={{ animation:"check-draw 0.5s ease forwards" }}/></svg>
              </div>
            </div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:600, color:"#e8f0ff", marginBottom:8 }}>You're in!</p>
            <p style={{ color:"#5a6e99", fontSize:14 }}>Redirecting to your dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} noValidate>

            {/* Champ Email */}
            <div className="lfe2" style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:500, color: emailFocus ? "#93c5fd" : "#5a6e99", marginBottom:8, letterSpacing:"0.04em", textTransform:"uppercase", transition:"color 0.25s" }}>Email</label>
              <div style={inputWrap(emailFocus)}>
                <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color: emailFocus ? "#3b82f6" : "#3a4d72", transition:"color 0.25s" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)} placeholder="you@vernicolor.tn" style={{ width:"100%", padding:"13px 14px 13px 42px", background:"transparent", border:"none", outline:"none", color:"#e8f0ff", fontSize:14, fontFamily:"'DM Sans',sans-serif", borderRadius:12 }}/>
              </div>
            </div>

            {/* Champ Mot de passe avec bouton afficher/masquer */}
            <div className="lfe3" style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:500, color: pwFocus ? "#93c5fd" : "#5a6e99", marginBottom:8, letterSpacing:"0.04em", textTransform:"uppercase", transition:"color 0.25s" }}>Password</label>
              <div style={inputWrap(pwFocus)}>
                <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color: pwFocus ? "#3b82f6" : "#3a4d72", transition:"color 0.25s" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setPwFocus(true)} onBlur={() => setPwFocus(false)} placeholder="••••••••••••" style={{ width:"100%", padding:"13px 44px 13px 42px", background:"transparent", border:"none", outline:"none", color:"#e8f0ff", fontSize:14, fontFamily:"'DM Sans',sans-serif", borderRadius:12 }}/>
                {/* Bouton œil pour afficher/masquer le mot de passe */}
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color: showPw ? "#3b82f6" : "#3a4d72", padding:4, display:"flex", alignItems:"center", transition:"color 0.25s" }}>
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            {/* Case "Remember me" + lien "Mot de passe oublié" */}
            <div className="lfe4" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none" }}>
                <div onClick={() => setRemember(!remember)} style={{ width:18, height:18, borderRadius:5, border: `1.5px solid ${remember ? "#3b82f6" : "rgba(255,255,255,0.15)"}`, background: remember ? "#2563eb" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.25s", cursor:"pointer", flexShrink:0 }}>
                  {remember && <svg width="10" height="10" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontSize:13, color:"#5a6e99", fontWeight:300 }}>Remember me</span>
              </label>
              {/* Ouvre la modale de réinitialisation de mot de passe */}
              <a href="#" onClick={e => { e.preventDefault(); setShowResetModal(true); }} style={{ fontSize:13, color:"#3b82f6", textDecoration:"none", fontWeight:400, transition:"color 0.2s" }} onMouseEnter={e => e.target.style.color="#93c5fd"} onMouseLeave={e => e.target.style.color="#3b82f6"}>Forgot password?</a>
            </div>

            {/* Message d'erreur — visible uniquement si error n'est pas vide */}
            {error && (
              <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:10, background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", color:"#f87171", fontSize:13, animation:"fade-in 0.3s ease", display:"flex", alignItems:"center", gap:8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            {/* Bouton de soumission — affiche le spinner pendant le chargement */}
            <div className="lfe5">
              <button type="submit" disabled={loading} className="btn-primary" style={{ width:"100%", padding:"14px", fontSize:15, letterSpacing:"0.02em", display:"flex", alignItems:"center", justifyContent:"center", gap:10, opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Spinner /> Signing in…</> : <>Sign in <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg></>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2 : ACCUEIL (après login)
// Affiche les statistiques, les cartes d'action, et les factures récentes
// ═══════════════════════════════════════════════════════════════════════════════
const HomePage = ({ setPage, username = "Admin", uploadedInvoices = [] }) => {
  // Statistiques affichées dans les 4 cartes du haut
  const stats = [
    { label:"Total Invoices", value: uploadedInvoices.length.toString(), delta:"+12%", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    { label:"Processed", value:"0", delta:"+8%", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg> },
    { label:"Pending Review", value: uploadedInvoices.length.toString(), delta:"-3%", neg:true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> },
    { label:"Total Revenue", value:"TND 0", delta:"+19%", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  ];

  return (
    <div style={{ paddingTop:80, minHeight:"100vh", padding:"80px 28px 40px", position:"relative", zIndex:1 }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* Message de bienvenue avec le nom de l'utilisateur connecté */}
        <div className="fe1" style={{ marginBottom:40 }}>
          <p style={{ fontSize:13, color:"#5a6e99", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>Good morning,</p>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:36, fontWeight:800, letterSpacing:"-0.5px", color:"#e8f0ff", marginBottom:8 }}>
            Welcome back, <span style={{ color:"#3b82f6" }}>{username}</span>
          </h1>
          <p style={{ color:"#5a6e99", fontSize:15, fontWeight:300 }}>Here's what's happening with your automotive invoices today.</p>
        </div>

        {/* Grille des 4 cartes de statistiques */}
        <div className="fe2" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:40 }}>
          {stats.map((s, i) => (
            <div key={i} className="surface-card" style={{ padding:"22px 24px", display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"rgba(37,99,235,0.09)", border:"1px solid rgba(37,99,235,0.18)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize:12, color:"#5a6e99", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</p>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700, color:"#e8f0ff", lineHeight:1 }}>{s.value}</p>
                {/* delta en rouge si négatif (neg:true), vert sinon */}
                <p style={{ fontSize:11, color: s.neg ? "#f87171" : "#10b981", marginTop:4, fontWeight:500 }}>{s.delta} this month</p>
              </div>
            </div>
          ))}
        </div>

        {/* Deux cartes d'action : Upload et Dashboard */}
        <div className="fe3" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:24, marginBottom:40 }}>

          {/* Carte Upload — redirige vers la page d'upload */}
          <div className="surface-card" onClick={() => setPage("upload")} style={{ padding:"36px 32px", cursor:"pointer", transition:"all 0.35s", position:"relative", overflow:"hidden" }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-5px)"; e.currentTarget.style.borderColor="rgba(37,99,235,0.4)"; e.currentTarget.style.boxShadow="0 22px 65px rgba(0,0,0,0.55), 0 0 45px rgba(37,99,235,0.14)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow="0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)"; }}>
            <div style={{ position:"absolute", top:0, right:0, width:130, height:130, background:"radial-gradient(circle,rgba(37,99,235,0.11) 0%,transparent 70%)", pointerEvents:"none" }}/>
            <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,rgba(37,99,235,0.22),rgba(59,130,246,0.15))", border:"1px solid rgba(37,99,235,0.35)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700, color:"#e8f0ff", marginBottom:10 }}>Upload Invoices</h2>
            <p style={{ color:"#5a6e99", fontSize:14, fontWeight:300, lineHeight:1.6, marginBottom:24 }}>Import PDF or image invoices from your automotive suppliers. Drag & drop or browse your files.</p>
            <div style={{ display:"flex", alignItems:"center", gap:8, color:"#3b82f6", fontSize:14, fontWeight:500 }}>
              Start uploading <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
            </div>
          </div>

          {/* Carte Dashboard — redirige vers la page analytics */}
          <div className="surface-card" onClick={() => setPage("dashboard")} style={{ padding:"36px 32px", cursor:"pointer", transition:"all 0.35s", position:"relative", overflow:"hidden" }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-5px)"; e.currentTarget.style.borderColor="rgba(59,130,246,0.4)"; e.currentTarget.style.boxShadow="0 22px 65px rgba(0,0,0,0.55), 0 0 45px rgba(59,130,246,0.14)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow="0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)"; }}>
            <div style={{ position:"absolute", top:0, right:0, width:130, height:130, background:"radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 70%)", pointerEvents:"none" }}/>
            <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,rgba(59,130,246,0.2),rgba(37,99,235,0.15))", border:"1px solid rgba(59,130,246,0.3)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700, color:"#e8f0ff", marginBottom:10 }}>View Dashboards</h2>
            <p style={{ color:"#5a6e99", fontSize:14, fontWeight:300, lineHeight:1.6, marginBottom:24 }}>Explore invoice analytics, revenue trends, and supplier performance metrics across your operations.</p>
            <div style={{ display:"flex", alignItems:"center", gap:8, color:"#60a5fa", fontSize:14, fontWeight:500 }}>
              Open analytics <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
            </div>
          </div>
        </div>

        {/* Tableau des factures récentes — affiche les 4 dernières uploadées */}
        <div className="fe4 surface-card" style={{ padding:"28px 28px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:"#e8f0ff" }}>Recent Invoices</h3>
            <button className="btn-ghost" style={{ fontSize:12, padding:"6px 14px" }} onClick={() => setPage("upload")}>View all</button>
          </div>

          {/* Si aucune facture uploadée → message vide */}
          {uploadedInvoices.length === 0 ? (
            <div style={{ textAlign:"center", padding:"36px 20px" }}>
              <div style={{ width:52, height:52, borderRadius:14, background:"rgba(37,99,235,0.07)", border:"1px solid rgba(37,99,235,0.14)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3a4d72" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              </div>
              <p style={{ fontSize:14, color:"#3a4d72", fontWeight:400 }}>No invoices uploaded yet.</p>
              <p style={{ fontSize:12, color:"#2a3550", marginTop:6, fontWeight:300 }}>Upload invoices from the Invoices page to see them here.</p>
            </div>
          ) : (
            // Affiche les 4 dernières factures en ordre inverse (plus récente en premier)
            uploadedInvoices.slice(-4).reverse().map((inv, i, arr) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"rgba(37,99,235,0.09)", border:"1px solid rgba(37,99,235,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:500, color:"#e8f0ff", marginBottom:2 }}>{inv.name}</p>
                    <p style={{ fontSize:11, color:"#5a6e99" }}>{inv.date}</p>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <span style={{ fontSize:11, color:"#5a6e99" }}>{inv.size}</span>
                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:500, background:"rgba(37,99,235,0.1)", color:"#60a5fa", border:"1px solid rgba(37,99,235,0.22)" }}>
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

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 3 : UPLOAD DE FACTURES
// Permet de glisser-déposer ou sélectionner des fichiers PDF/images
// ═══════════════════════════════════════════════════════════════════════════════
const UploadPage = ({ onUploaded }) => {
  const [dragging, setDragging] = useState(false);   // fichier en cours de glisser au-dessus
  const [files, setFiles] = useState([]);             // fichiers sélectionnés, pas encore envoyés
  const [uploading, setUploading] = useState(false);  // upload en cours
  const [uploaded, setUploaded] = useState([]);       // fichiers déjà uploadés avec succès
  const inputRef = useRef(null);     // référence à l'input fichier caché
  const cameraRef = useRef(null);    // référence à l'input caméra caché

  // Gestion du glisser-déposer — filtre uniquement PDF et images
  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.includes("pdf") || f.type.includes("image"));
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  // Sélection via le bouton "Browse files"
  const handlePick = e => { const picked = Array.from(e.target.files); setFiles(prev => [...prev, ...picked]); };

  // Capture via la caméra du téléphone
  const handleCameraCapture = e => { const picked = Array.from(e.target.files); setFiles(prev => [...prev, ...picked]); };

  // Supprime un fichier de la liste avant l'upload
  const removeFile = idx => setFiles(prev => prev.filter((_, i) => i !== idx));

  // Simule l'upload (2 secondes de délai) puis déplace les fichiers dans "uploaded"
  const handleUpload = () => {
    if (!files.length) return;
    setUploading(true);
    setTimeout(() => {
      const newUploaded = files.map(f => ({ name: f.name, size: (f.size / 1024).toFixed(1) + " KB", date: "Just now" }));
      setUploaded(prev => [...prev, ...newUploaded]);
      if (onUploaded) onUploaded(newUploaded);  // remonte les fichiers au composant parent (App)
      setFiles([]);
      setUploading(false);
    }, 2000);
  };

  // Icône PDF réutilisée dans la liste de fichiers
  const fileIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
  );

  return (
    <div style={{ paddingTop:80, minHeight:"100vh", padding:"80px 28px 40px", position:"relative", zIndex:1 }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <div className="fe1" style={{ marginBottom:32 }}>
          <p style={{ fontSize:12, color:"#5a6e99", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Invoice Management</p>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:30, fontWeight:800, color:"#e8f0ff", marginBottom:6, letterSpacing:"-0.3px" }}>Upload <span style={{ color:"#3b82f6" }}>Invoices</span></h1>
          <p style={{ color:"#5a6e99", fontSize:14, fontWeight:300 }}>Upload PDF or image invoices from your automotive suppliers.</p>
        </div>

        {/* Zone de glisser-déposer — change de style quand un fichier est au-dessus */}
        <div className="fe2 surface-card" style={{ padding:"60px 40px", textAlign:"center", marginBottom:24, cursor:"pointer", transition:"all 0.35s", borderColor: dragging ? "rgba(37,99,235,0.65)" : undefined, boxShadow: dragging ? "0 0 0 4px rgba(37,99,235,0.14), 0 8px 40px rgba(0,0,0,0.45)" : undefined, background: dragging ? "rgba(37,99,235,0.05)" : undefined }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          {/* Inputs cachés — déclenchés par les boutons visibles */}
          <input ref={inputRef} type="file" multiple accept="application/pdf,image/*" onChange={handlePick} style={{ display:"none" }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} style={{ display:"none" }} />

          <div style={{ width:72, height:72, borderRadius:20, background:"linear-gradient(135deg,rgba(37,99,235,0.17),rgba(59,130,246,0.12))", border:"1px solid rgba(37,99,235,0.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", animation: dragging ? "pulse-glow 1s ease infinite" : undefined }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:"#e8f0ff", marginBottom:8 }}>
            {dragging ? "Drop files here" : "Drag & drop your files"}
          </p>
          <p style={{ color:"#5a6e99", fontSize:13, marginBottom:20 }}>Supports PDF, JPG, PNG · Max 20MB per file</p>

          {/* Boutons Browse et Take Photo */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, flexWrap:"wrap" }} onClick={e => e.stopPropagation()}>
            <div className="btn-primary" style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 24px", borderRadius:10, fontSize:13, cursor:"pointer" }} onClick={() => inputRef.current?.click()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Browse files
            </div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 22px", borderRadius:10, fontSize:13, cursor:"pointer", background:"rgba(37,99,235,0.1)", border:"1px solid rgba(37,99,235,0.3)", color:"#93c5fd", fontFamily:"'Syne',sans-serif", fontWeight:600, transition:"all 0.25s" }}
              onClick={() => cameraRef.current?.click()}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(37,99,235,0.18)"; e.currentTarget.style.borderColor="rgba(37,99,235,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(37,99,235,0.1)"; e.currentTarget.style.borderColor="rgba(37,99,235,0.3)"; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Take Photo
            </div>
          </div>
        </div>

        {/* Liste des fichiers en attente d'upload */}
        {files.length > 0 && (
          <div className="fe3 surface-card" style={{ padding:"20px 24px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <p style={{ fontSize:13, fontWeight:600, color:"#e8f0ff" }}>{files.length} file{files.length>1?"s":""} ready to upload</p>
              <button className="btn-primary" onClick={handleUpload} disabled={uploading} style={{ padding:"9px 22px", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
                {uploading ? <><Spinner />Uploading…</> : "Upload all"}
              </button>
            </div>
            {files.map((f, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,0.03)", marginBottom:8, border:"1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  {fileIcon}
                  <div>
                    <p style={{ fontSize:13, color:"#e8f0ff", fontWeight:400 }}>{f.name}</p>
                    <p style={{ fontSize:11, color:"#5a6e99" }}>{(f.size/1024).toFixed(1)} KB</p>
                  </div>
                </div>
                {/* Bouton X pour retirer un fichier de la liste */}
                <button onClick={() => removeFile(i)} style={{ background:"none", border:"none", cursor:"pointer", color:"#5a6e99", padding:4, transition:"color 0.2s" }} onMouseEnter={e => e.target.style.color="#f87171"} onMouseLeave={e => e.target.style.color="#5a6e99"}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Historique des fichiers déjà uploadés dans cette session */}
        {uploaded.length > 0 && (
          <div className="fe4 surface-card" style={{ padding:"20px 24px" }}>
            <p style={{ fontSize:13, fontWeight:600, color:"#e8f0ff", marginBottom:16 }}>Uploaded files</p>
            {uploaded.map((f, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", borderRadius:10, background:"rgba(16,185,129,0.04)", marginBottom:8, border:"1px solid rgba(16,185,129,0.12)", animation:"fade-in 0.4s ease" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                  <div>
                    <p style={{ fontSize:13, color:"#e8f0ff" }}>{f.name}</p>
                    <p style={{ fontSize:11, color:"#5a6e99" }}>{f.size} · {f.date}</p>
                  </div>
                </div>
                <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:"rgba(16,185,129,0.12)", color:"#10b981", border:"1px solid rgba(16,185,129,0.25)", fontWeight:500 }}>Uploaded ✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 4 : ANALYTICS DASHBOARD
// Graphiques et statistiques des factures et fournisseurs
// ═══════════════════════════════════════════════════════════════════════════════

// Graphique à barres verticales — utilisé pour le volume de factures
const MiniBarChart = ({ data, color }) => {
  const max = Math.max(...data);  // valeur max pour normaliser les hauteurs
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:80 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", height:"100%" }}>
          {/* Hauteur calculée en % par rapport au max */}
          <div style={{ width:"100%", borderRadius:"4px 4px 0 0", background:`linear-gradient(180deg,${color} 0%,${color}88 100%)`, height:`${(v/max)*100}%`, transformOrigin:"bottom", animation:`bar-grow 0.9s cubic-bezier(0.22,1,0.36,1) ${i*0.06}s both` }}/>
        </div>
      ))}
    </div>
  );
};

// Graphique linéaire avec zone remplie — utilisé pour la tendance des revenus
const MiniLineChart = ({ data, color }) => {
  const max = Math.max(...data); const min = Math.min(...data);
  const w = 200, h = 60, pad = 4;

  // Calcul des coordonnées SVG pour chaque point
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  // Chemin de remplissage sous la courbe
  const fill = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return `${x},${y}`;
  });
  const fillPath = `M${fill[0]} L${fill.slice(1).join(" L")} L${w - pad},${h - pad} L${pad},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:"100%", height:60, overflow:"visible" }}>
      <defs>
        {/* Dégradé vertical pour la zone sous la courbe */}
        <linearGradient id={`lg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#lg-${color.replace("#","")})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="300" style={{ animation:"dash-draw 1.3s ease forwards" }}/>
    </svg>
  );
};

const DashboardPage = () => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Données mensuelles fictives pour les graphiques
  const invoiceData = [42,58,53,71,68,84,79,92,88,104,98,112];
  const revenueData = [38,52,47,65,70,81,74,90,85,99,94,108];

  // Top 5 fournisseurs avec leur volume de factures et montant
  const suppliers = [
    { name:"AutoParts Pro", invoices:312, amount:"TND 142K", pct:31 },
    { name:"MechaniX Tunisia", invoices:248, amount:"TND 98K", pct:25 },
    { name:"CarTech Sfax", invoices:201, amount:"TND 84K", pct:20 },
    { name:"VehicleParts Co.", invoices:163, amount:"TND 61K", pct:16 },
    { name:"AutoShield Tunis", invoices:90, amount:"TND 34K", pct:8 },
  ];

  // KPIs affichés dans les cartes du haut
  const kpis = [
    { label:"Avg. Invoice Value", value:"TND 655", trend:"+7.2%" },
    { label:"Processing Time", value:"1.4 days", trend:"-18%" },
    { label:"Approval Rate", value:"96.4%", trend:"+2.1%" },
    { label:"Active Suppliers", value:"28", trend:"+4" },
  ];

  return (
    <div style={{ paddingTop:80, minHeight:"100vh", padding:"80px 28px 40px", position:"relative", zIndex:1 }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* En-tête de la page */}
        <div className="fe1" style={{ marginBottom:32 }}>
          <p style={{ fontSize:12, color:"#5a6e99", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Analytics Overview</p>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:30, fontWeight:800, color:"#e8f0ff", marginBottom:6, letterSpacing:"-0.3px" }}>Invoice <span style={{ color:"#3b82f6" }}>Dashboard</span></h1>
          <p style={{ color:"#5a6e99", fontSize:14, fontWeight:300 }}>Real-time analytics for your automotive invoice operations.</p>
        </div>

        {/* Ligne des 4 KPIs */}
        <div className="fe2" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:28 }}>
          {kpis.map((k, i) => (
            <div key={i} className="surface-card" style={{ padding:"20px 22px" }}>
              <p style={{ fontSize:11, color:"#5a6e99", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>{k.label}</p>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:700, color:"#e8f0ff", marginBottom:4, animation:`counter-up 0.7s ease ${i*0.1}s both` }}>{k.value}</p>
              <p style={{ fontSize:11, color:"#10b981", fontWeight:500 }}>{k.trend} vs last month</p>
            </div>
          ))}
        </div>

        {/* Ligne des deux graphiques : barres et courbe */}
        <div className="fe3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
          {/* Graphique volume de factures */}
          <div className="surface-card" style={{ padding:"24px 24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
              <div>
                <p style={{ fontSize:12, color:"#5a6e99", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:4 }}>Invoice Volume</p>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:"#e8f0ff" }}>1,284</p>
                <p style={{ fontSize:11, color:"#10b981", fontWeight:500 }}>+12% this year</p>
              </div>
              <span style={{ fontSize:10, padding:"4px 10px", borderRadius:20, background:"rgba(16,185,129,0.1)", color:"#10b981", border:"1px solid rgba(16,185,129,0.22)", fontWeight:500 }}>↑ Trending</span>
            </div>
            <MiniBarChart data={invoiceData} color="#2563eb" />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
              {months.map((m, i) => <span key={i} style={{ fontSize:9, color:"#3a4d72", textAlign:"center", flex:1 }}>{m}</span>)}
            </div>
          </div>

          {/* Graphique tendance des revenus */}
          <div className="surface-card" style={{ padding:"24px 24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
              <div>
                <p style={{ fontSize:12, color:"#5a6e99", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:4 }}>Revenue Trend</p>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:"#e8f0ff" }}>TND 842K</p>
                <p style={{ fontSize:11, color:"#10b981", fontWeight:500 }}>+19% this year</p>
              </div>
              <span style={{ fontSize:10, padding:"4px 10px", borderRadius:20, background:"rgba(59,130,246,0.1)", color:"#60a5fa", border:"1px solid rgba(59,130,246,0.22)", fontWeight:500 }}>12 months</span>
            </div>
            <MiniLineChart data={revenueData} color="#3b82f6" />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
              {months.map((m, i) => <span key={i} style={{ fontSize:9, color:"#3a4d72", textAlign:"center", flex:1 }}>{m}</span>)}
            </div>
          </div>
        </div>

        {/* Ligne inférieure : donut statut + barre fournisseurs */}
        <div className="fe4" style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:20 }}>

          {/* Graphique donut — répartition des statuts de factures */}
          <div className="surface-card" style={{ padding:"24px" }}>
            <p style={{ fontSize:12, color:"#5a6e99", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:20 }}>Invoice Status</p>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16"/>
                <circle cx="70" cy="70" r="54" fill="none" stroke="#2563eb" strokeWidth="16" strokeDasharray="339.3" strokeDashoffset="51" strokeLinecap="round" transform="rotate(-90 70 70)" style={{ animation:"dash-draw 1.5s ease forwards" }}/>
                <circle cx="70" cy="70" r="54" fill="none" stroke="#60a5fa" strokeWidth="16" strokeDasharray="50.9 339.3" strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 70 70)" opacity="0.8"/>
                <text x="70" y="66" textAnchor="middle" fill="#e8f0ff" fontSize="18" fontWeight="700" fontFamily="Syne,sans-serif">85%</text>
                <text x="70" y="82" textAnchor="middle" fill="#5a6e99" fontSize="10">Processed</text>
              </svg>
            </div>
            {[["Processed", "1,091", "#2563eb", "85%"], ["Pending", "193", "#60a5fa", "15%"]].map(([l, v, c, p], i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:c }}/>
                  <span style={{ fontSize:13, color:"#c0cfee" }}>{l}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:13, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"#e8f0ff" }}>{v}</span>
                  <span style={{ fontSize:11, color:"#5a6e99" }}>{p}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Barres horizontales des top fournisseurs */}
          <div className="surface-card" style={{ padding:"24px" }}>
            <p style={{ fontSize:12, color:"#5a6e99", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:20 }}>Top Suppliers</p>
            {suppliers.map((s, i) => (
              <div key={i} style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:13, color:"#c0cfee" }}>{s.name}</span>
                  <div style={{ display:"flex", gap:16 }}>
                    <span style={{ fontSize:12, color:"#5a6e99" }}>{s.invoices} inv.</span>
                    <span style={{ fontSize:12, fontWeight:600, color:"#e8f0ff", fontFamily:"'Syne',sans-serif" }}>{s.amount}</span>
                  </div>
                </div>
                {/* Barre de progression — largeur = pourcentage du fournisseur */}
                <div style={{ height:5, borderRadius:3, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:3, background:`linear-gradient(90deg,#1d4ed8,#3b82f6)`, width:`${s.pct}%`, animation:`bar-grow 0.9s cubic-bezier(0.22,1,0.36,1) ${i*0.1}s both`, transformOrigin:"left" }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT RACINE — point d'entrée de toute l'application
// Gère la navigation entre les pages et le state global partagé
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("login");               // page actuellement affichée
  const [username, setUsername] = useState("Admin");       // nom de l'utilisateur connecté
  const [uploadedInvoices, setUploadedInvoices] = useState([]); // factures uploadées (partagées entre HomePage et UploadPage)

  // Appelée après un login réussi — change de page et sauvegarde le nom
  const handleLogin = (name) => { setUsername(name); setPage("home"); };

  // Appelée sur "Logout" — remet tout à zéro
  const handleLogout = () => { setPage("login"); setUsername("Admin"); };

  // Appelée depuis UploadPage — ajoute les nouvelles factures à la liste globale
  const handleUploaded = (newFiles) => { setUploadedInvoices(prev => [...prev, ...newFiles]); };

  return (
    <>
      {/* Styles CSS globaux injectés dans le <head> */}
      <GlobalStyles />

      {/* Éléments de fond — toujours visibles derrière le contenu */}
      <Background />
      <Orbs />

      {/* Barre de navigation et badge logo — cachés sur la page de login */}
      {page !== "login" && (
        <>
          <CornerBadge />
          <TopNav page={page} setPage={setPage} user={username} onLogout={handleLogout} />
        </>
      )}

      {/* Contenu principal — change de page avec animation d'entrée */}
      <div key={page} className="page-enter">
        {page === "login"     && <LoginPage onLogin={handleLogin} />}
        {page === "home"      && <HomePage setPage={setPage} username={username} uploadedInvoices={uploadedInvoices} />}
        {page === "upload"    && <UploadPage onUploaded={handleUploaded} />}
        {page === "dashboard" && <DashboardPage />}
      </div>

      {/* Pied de page — visible uniquement sur la page de login */}
      {page === "login" && (
        <div style={{ position:"fixed", bottom:20, left:0, right:0, textAlign:"center", zIndex:2, animation:"fade-in 1s ease 0.8s both" }}>
          <span style={{ fontSize:12, color:"#1e2d4a", letterSpacing:"0.04em" }}>© 2026 VerniColor Tunisia · Privacy · Terms</span>
        </div>
      )}
    </>
  );
}