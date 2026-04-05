// ─── src/pages/VerniColorApp.jsx ─────────────────────────────────────────────
// Composant racine — orchestrateur principal.
//
// MODIFICATION RBAC :
//   handleLogin() sauvegarde maintenant le rôle dans localStorage
//   pour que UploadPage (et les autres pages) puissent y accéder.

import { useState } from "react";

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
export default function VerniColorApp() {

  const [page,             setPage]             = useState("login");
  const [username,         setUsername]         = useState("Admin");
  const [uploadedInvoices, setUploadedInvoices] = useState([]);
  const [ocrData,          setOcrData]          = useState(null);

  // ── Login : sauvegarde rôle + username dans localStorage ─────────────────
  // Le backend renvoie : { username, role, token? }
  // On sauvegarde le rôle pour que UploadPage puisse faire :
  //   const role = localStorage.getItem("role");
  const handleLogin = (name, role) => {
  setUsername(name);
  localStorage.setItem("username", name);
  localStorage.setItem("role", role || "Utilisateur");
  // Admin → va directement sur admin dashboard
  const isAdmin = ["Administrateur Système", "Administrateur"].includes(role);
  setPage(isAdmin ? "admin" : "home");   // ← MODIFICATION
};

  // ── Logout : nettoyage du localStorage ───────────────────────────────────
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

      {page !== "login" && (
        <>
          <CornerBadge />
          <TopNav page={page} setPage={setPage} user={username} onLogout={handleLogout} />
        </>
      )}

      <div key={page} className="page-enter">
        {page === "login"        && <LoginPage onLogin={handleLogin} />}
        {page === "home"         && <HomePage setPage={setPage} username={username} uploadedInvoices={uploadedInvoices} />}
        {page === "upload"       && <UploadPage onUploaded={handleUploaded} onOcrDone={handleOcrDone} />}
        {page === "dashboard"    && <DashboardPage />}
        {page === "admin" && <AdminPage />}   
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