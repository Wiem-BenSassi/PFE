// ─── src/pages/VerniColorApp.jsx ─────────────────────────────────────────────
// Composant racine — orchestrateur principal de l'application.
//
// Responsabilités :
//   ✔ Injecter les styles globaux
//   ✔ Afficher le fond animé et les orbes
//   ✔ Gérer le state global : page courante, utilisateur, factures uploadées, données OCR
//   ✔ Gérer la navigation entre les pages (login → home → upload → verification → dashboard)
//   ✔ Passer les props nécessaires à chaque page
//
// Ce fichier NE contient plus :
//   ✘ Le code des pages (déplacé dans src/pages/)
//   ✘ Les composants UI (déplacés dans src/components/)
//   ✘ Les styles CSS (déplacés dans src/components/GlobalStyles.jsx)

import { useState } from "react";

// ── Styles et fond ────────────────────────────────────────────────────────────
import GlobalStyles from "../components/GlobalStyles";
import Background   from "../components/Background";
import Orbs         from "../components/Orbs";

// ── Composants de navigation ──────────────────────────────────────────────────
import TopNav, { CornerBadge } from "../components/TopNav";

// ── Pages ─────────────────────────────────────────────────────────────────────
import LoginPage          from "./LoginPage";
import HomePage           from "./HomePage";
import UploadPage         from "./UploadPage";
import DashboardPage      from "./DashboardPage";
import InvoiceVerification from "./InvoiceVerification";

// ══════════════════════════════════════════════════════════════════════════════

export default function VerniColorApp() {
  // ── State global ─────────────────────────────────────────────────────────
  const [page,             setPage]             = useState("login");   // page affichée
  const [username,         setUsername]         = useState("Admin");   // utilisateur connecté
  const [uploadedInvoices, setUploadedInvoices] = useState([]);        // factures uploadées
  const [ocrData,          setOcrData]          = useState(null);      // données OCR en cours

  // ── Handlers de navigation ────────────────────────────────────────────────

  // Appelé après un login réussi
  const handleLogin  = (name) => { setUsername(name); setPage("home"); };

  // Appelé sur "Logout"
  const handleLogout = () => { setPage("login"); setUsername("Admin"); };

  // Appelé depuis UploadPage après un upload réussi
  const handleUploaded = (newFiles) => {
    setUploadedInvoices(prev => [...prev, ...newFiles]);
  };

  // Appelé depuis UploadPage après l'analyse OCR — redirige vers la vérification
  const handleOcrDone = (data) => {
    setOcrData(data);
    setPage("verification");
  };

  // Appelé depuis InvoiceVerification — retour à l'upload
  const handleVerificationBack = () => setPage("upload");

  // Appelé depuis InvoiceVerification après confirmation — retour à l'accueil
  const handleVerificationConfirm = (corrected) => {
    console.log("Verified invoice:", corrected);
    setPage("home");
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Styles CSS globaux injectés dans le <head> */}
      <GlobalStyles />

      {/* Éléments de fond — toujours visibles derrière le contenu */}
      <Background />
      <Orbs />

      {/* Barre de navigation et badge logo — masqués sur la page de login */}
      {page !== "login" && (
        <>
          <CornerBadge />
          <TopNav page={page} setPage={setPage} user={username} onLogout={handleLogout} />
        </>
      )}

      {/* Contenu principal — animé à chaque changement de page */}
      <div key={page} className="page-enter">
        {page === "login"        && <LoginPage onLogin={handleLogin} />}
        {page === "home"         && <HomePage setPage={setPage} username={username} uploadedInvoices={uploadedInvoices} />}
        {page === "upload"       && <UploadPage onUploaded={handleUploaded} onOcrDone={handleOcrDone} />}
        {page === "dashboard"    && <DashboardPage />}
        {page === "verification" && (
          <InvoiceVerification
            ocrData={ocrData}
            onBack={handleVerificationBack}
            onConfirm={handleVerificationConfirm}
          />
        )}
      </div>

      {/* Pied de page — visible uniquement sur la page de login */}
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