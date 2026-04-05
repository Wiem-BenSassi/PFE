// ─── src/pages/LoginPage.jsx ─────────────────────────────────────────────────
// Page de connexion.
//
// MODIFICATION RBAC :
//   onLogin(username, role) — le rôle est maintenant passé au parent
//   qui le sauvegarde dans localStorage (VerniColorApp.jsx).

import { useState } from "react";
import { AutomotiveIcon, Spinner, EyeIcon } from "../components/Icons";

const LoginPage = ({ onLogin }) => {
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [showPw,         setShowPw]         = useState(false);
  const [remember,       setRemember]       = useState(false);
  const [emailFocus,     setEmailFocus]     = useState(false);
  const [pwFocus,        setPwFocus]        = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [success,        setSuccess]        = useState(false);
  const [error,          setError]          = useState("");
  const [shake,          setShake]          = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      triggerShake();
      return;
    }
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setLoading(false);

        // ── RBAC : on passe username ET role au parent ──────────────────────
        // Le backend doit renvoyer : { username, role, token? }
        // Exemple de réponse : { username: "Alice", role: "comptabilité" }
        setTimeout(() => onLogin(data.username, data.role), 900);

      } else {
        setLoading(false);
        setError(data.detail || "Identifiants incorrects");
        triggerShake();
      }
    } catch {
      setLoading(false);
      setError("Erreur serveur — vérifiez que le backend est démarré.");
    }
  };

  const inputWrap = (focused) => ({
    position  : "relative", borderRadius: 12,
    background: focused ? "rgba(37,99,235,0.07)" : "rgba(255,255,255,0.03)",
    border    : `1px solid ${focused ? "rgba(37,99,235,0.55)" : "rgba(255,255,255,0.08)"}`,
    transition: "all 0.3s",
    boxShadow : focused ? "0 0 0 4px rgba(37,99,235,0.12)" : "none",
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", position: "relative", zIndex: 1 }}>

      {/* Modale mot de passe oublié */}
      {showResetModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(7px)", animation: "fade-in 0.25s ease" }} onClick={() => setShowResetModal(false)}>
          <div style={{ background: "linear-gradient(145deg,#0d1627,#0a1120)", border: "1px solid rgba(37,99,235,0.35)", borderRadius: 20, padding: "32px 36px", maxWidth: 360, width: "90%", textAlign: "center", animation: "slide-up 0.35s cubic-bezier(0.22,1,0.36,1)" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "#e8f0ff", marginBottom: 10 }}>Vérifiez votre boîte mail</p>
            <p style={{ fontSize: 14, color: "#5a6e99", fontWeight: 300, lineHeight: 1.6, marginBottom: 24 }}>Un lien de réinitialisation a été envoyé.</p>
            <button className="btn-primary" onClick={() => setShowResetModal(false)} style={{ padding: "10px 28px", fontSize: 14 }}>OK</button>
          </div>
        </div>
      )}

      {/* Carte du formulaire */}
      <div className="card-enter" style={{ width: "100%", maxWidth: 420, background: "linear-gradient(145deg,#0d1627 0%,#0a1120 100%)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 36px 90px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)", padding: "40px 36px", position: "relative", overflow: "hidden", animation: shake ? "shake 0.5s ease" : undefined }}>

        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "70%", height: 1, background: "linear-gradient(90deg,transparent,rgba(37,99,235,0.6),transparent)", pointerEvents: "none" }} />

        {/* Logo */}
        <div className="lfe1" style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
            <div style={{ width: 120, height: 60, borderRadius: 12, background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <img src="/logo-vernicolor.png" alt="VerniColor Tunisia Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}/>
              <div style={{ display: "none", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <AutomotiveIcon size={26} color="#3b82f6" />
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 10, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.06em" }}>VERNICOLOR</span>
              </div>
            </div>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: "-0.3px", color: "#e8f0ff", marginBottom: 2 }}>
            <span style={{ color: "#3b82f6" }}>Verni</span>Color
          </h1>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", color: "#3a4d72", textTransform: "uppercase", marginBottom: 8 }}>Tunisia</p>
          <p style={{ color: "#3a4d72", fontSize: 13, fontWeight: 300 }}>Connectez-vous à votre espace</p>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0", animation: "fade-in 0.5s ease" }}>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <polyline points="5,12 10,17 19,7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" style={{ animation: "check-draw 0.5s ease forwards" }}/>
                </svg>
              </div>
            </div>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 600, color: "#e8f0ff", marginBottom: 8 }}>Connecté !</p>
            <p style={{ color: "#5a6e99", fontSize: 14 }}>Redirection en cours…</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} noValidate>

            {/* Email */}
            <div className="lfe2" style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: emailFocus ? "#93c5fd" : "#5a6e99", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase", transition: "color 0.25s" }}>Email</label>
              <div style={inputWrap(emailFocus)}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: emailFocus ? "#3b82f6" : "#3a4d72", transition: "color 0.25s" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)} placeholder="vous@vernicolor.tn" style={{ width: "100%", padding: "13px 14px 13px 42px", background: "transparent", border: "none", outline: "none", color: "#e8f0ff", fontSize: 14, fontFamily: "'DM Sans',sans-serif", borderRadius: 12 }}/>
              </div>
            </div>

            {/* Mot de passe */}
            <div className="lfe3" style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: pwFocus ? "#93c5fd" : "#5a6e99", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase", transition: "color 0.25s" }}>Mot de passe</label>
              <div style={inputWrap(pwFocus)}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: pwFocus ? "#3b82f6" : "#3a4d72", transition: "color 0.25s" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setPwFocus(true)} onBlur={() => setPwFocus(false)} placeholder="••••••••••••" style={{ width: "100%", padding: "13px 44px 13px 42px", background: "transparent", border: "none", outline: "none", color: "#e8f0ff", fontSize: 14, fontFamily: "'DM Sans',sans-serif", borderRadius: 12 }}/>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: showPw ? "#3b82f6" : "#3a4d72", padding: 4, display: "flex", alignItems: "center", transition: "color 0.25s" }}>
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="lfe4" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                <div onClick={() => setRemember(!remember)} style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${remember ? "#3b82f6" : "rgba(255,255,255,0.15)"}`, background: remember ? "#2563eb" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s", cursor: "pointer", flexShrink: 0 }}>
                  {remember && <svg width="10" height="10" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontSize: 13, color: "#5a6e99", fontWeight: 300 }}>Se souvenir de moi</span>
              </label>
              <a href="#" onClick={e => { e.preventDefault(); setShowResetModal(true); }} style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none", fontWeight: 400 }}>
                Mot de passe oublié ?
              </a>
            </div>

            {/* Erreur */}
            {error && (
              <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", fontSize: 13, animation: "fade-in 0.3s ease", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            {/* Bouton connexion */}
            <div className="lfe5">
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "14px", fontSize: 15, letterSpacing: "0.02em", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: loading ? 0.7 : 1 }}>
                {loading ? (
                  <><Spinner /> Connexion…</>
                ) : (
                  <>Se connecter <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg></>
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;