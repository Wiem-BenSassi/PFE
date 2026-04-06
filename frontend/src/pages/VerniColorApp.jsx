import { useState, useEffect } from "react";

import GlobalStyles       from "../components/GlobalStyles";
import Background         from "../components/Background";
import Orbs               from "../components/Orbs";
import TopNav, { CornerBadge } from "../components/TopNav";

import LoginPage           from "./LoginPage";
import HomePage            from "./HomePage";
import UploadPage          from "./UploadPage";
import DashboardPage       from "./DashboardPage";
import InvoiceVerification from "./InvoiceVerification";
import AdminPage from "./AdminPage";

// ══════════════════════════════════════════════════════════════
// RBAC — table des permissions par page
// Clé = nom de la page, valeur = liste des rôles autorisés
// ══════════════════════════════════════════════════════════════
const PAGE_ROLES = {
  dashboard : ["Comptable"],
  admin     : ["Administrateur Système", "Administrateur"],
  // ✅ CORRECTION : "Utilisateur" ajouté pour accéder à la page upload
  upload    : ["Comptable", "Administrateur Système", "Administrateur", "Utilisateur"],
  home      : ["Comptable", "Administrateur Système", "Administrateur", "Utilisateur"],
};

export default function VerniColorApp() {

  const [page,             setPage]             = useState("login");
  const [username,         setUsername]         = useState("Admin");
  const [uploadedInvoices, setUploadedInvoices] = useState([]);
  const [ocrData,          setOcrData]          = useState(null);

  // ── Toast de permission refusée ───────────────────────────
  const [permToast, setPermToast] = useState(null);

  const showPermToast = (msg) => {
    setPermToast(msg);
    setTimeout(() => setPermToast(null), 3500);
  };

  // ── Navigation protégée ───────────────────────────────────
  const goTo = (targetPage) => {
    const role        = localStorage.getItem("role") || "";
    const allowedRoles = PAGE_ROLES[targetPage];

    if (!allowedRoles) {
      setPage(targetPage);
      return;
    }

    if (allowedRoles.includes(role)) {
      setPage(targetPage);
    } else {
      showPermToast(`Accès refusé`);
      setPage("home");
    }
  };

  // ── Login ─────────────────────────────────────────────────
  const handleLogin = (name, role) => {
    setUsername(name);
    localStorage.setItem("username", name);
    localStorage.setItem("role", role || "Utilisateur");
    const isAdmin = ["Administrateur Système", "Administrateur"].includes(role);
    setPage(isAdmin ? "admin" : "home");
  };

  // ── Logout ────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    setPage("login");
    setUsername("Admin");
  };

  const handleUploaded = (newFiles) => {
    setUploadedInvoices(prev => [...prev, ...newFiles]);
  };

  const handleOcrDone = (data) => {
    setOcrData(data);
    setPage("verification");
  };

  const handleVerificationBack    = () => setPage("upload");
  const handleVerificationConfirm = (corrected) => {
    console.log("Verified invoice:", corrected);
    setPage("home");
  };

  return (
    <>
      <GlobalStyles />
      <Background />
      <Orbs />

      {/* ── Toast permission refusée ──────────────────────── */}
      {permToast && (
        <div style={{
          position  : "fixed", bottom: 24, left: "50%",
          transform : "translateX(-50%)",
          zIndex    : 9999,
          padding   : "12px 20px",
          borderRadius: 12, fontSize: 13, fontWeight: 500,
          background: "rgba(248,113,113,0.15)",
          border    : "1px solid rgba(248,113,113,0.4)",
          color     : "#f87171",
          display   : "flex", alignItems: "center", gap: 8,
          animation : "fade-in 0.3s ease",
          whiteSpace: "nowrap",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          {permToast}
        </div>
      )}

      {page !== "login" && (
        <>
          <CornerBadge />
          <TopNav page={page} setPage={goTo} user={username} onLogout={handleLogout} />
        </>
      )}

      <div key={page} className="page-enter">
        {page === "login"        && <LoginPage onLogin={handleLogin} />}
        {page === "home"         && <HomePage setPage={goTo} username={username} uploadedInvoices={uploadedInvoices} />}
        {page === "upload"       && <UploadPage onUploaded={handleUploaded} onOcrDone={handleOcrDone} />}
        {page === "dashboard"    && <DashboardPage />}
        {page === "admin"        && <AdminPage />}
        {page === "verification" && (
          <InvoiceVerification
            ocrData={ocrData}
            onBack={handleVerificationBack}
            onConfirm={handleVerificationConfirm}
          />
        )}
      </div>

      {page === "login" && (
        <div style={{ position: "fixed", bottom: 20, left: 0, right: 0, textAlign: "center", zIndex: 2, animation: "fade-in 1s ease 0.8s both" }}>
          <span style={{ fontSize: 12, color: "#1e2d4a", letterSpacing: "0.04em" }}>
            © 2026 VerniColor Tunisia · Privacy · Terms
          </span>
        </div>
      )}
    </>
  );
}