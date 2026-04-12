// ─── src/pages/VerniColorApp.jsx ─────────────────────────────────────────────
// MODIFICATION : ajout du flux "expense" →  ExpenseVerificationPage
// MODIFICATION : ajout de la route "budget_admin" → BudgetAdminPage
// MODIFICATION : ajout de l'archivage frontend → ArchivePage + useArchive ← AJOUTÉ

import { useState, useEffect } from "react";

import GlobalStyles       from "../components/GlobalStyles";
import Background         from "../components/Background";
import Orbs               from "../components/Orbs";
import TopNav, { CornerBadge } from "../components/TopNav";

import LoginPage                from "./LoginPage";
import HomePage                 from "./HomePage";
import UploadPage               from "./UploadPage";
import DashboardPage            from "./DashboardPage";
import InvoiceVerification      from "./InvoiceVerification";
import ExpenseVerificationPage  from "./Expenseverificationpage";
import AdminPage                from "./AdminPage";
import SystemAdminPage          from "./SystemAdminPage";
import ArchivePage              from "./ArchivePage";        // ← AJOUTÉ
import { useArchive }           from "../hooks/useArchive";  // ← AJOUTÉ


// ── RBAC — permissions par page ──────────────────────────────────────────────
const PAGE_ROLES = {
  dashboard : ["Comptable"],
  admin     : ["Administrateur Système", "Administrateur"],
  sysadmin  : ["Administrateur Système"],
  upload    : ["Comptable", "Administrateur Système", "Administrateur", "Utilisateur"],
  home      : ["Comptable", "Administrateur Système", "Administrateur", "Utilisateur"],
  archive   : ["Comptable", "Administrateur Système", "Administrateur", "Utilisateur"], // ← AJOUTÉ
};

export default function VerniColorApp() {

  const [page,             setPage]             = useState("login");
  const [username,         setUsername]         = useState("Admin");
  const [uploadedInvoices, setUploadedInvoices] = useState([]);

  // Données OCR facture fournisseur → InvoiceVerification
  const [ocrData,          setOcrData]          = useState(null);

  // Données OCR note de frais → ExpenseVerificationPage
  const [expenseData,      setExpenseData]      = useState(null);

  // Toast de permission refusée
  const [permToast, setPermToast] = useState(null);

  // ── Hook archivage localStorage ──────────────────────────────────────────
  // ← AJOUTÉ : toute la logique archive est encapsulée dans ce hook
  const { archivedFiles, addToArchive, removeFromArchive, clearArchive } = useArchive();

  const showPermToast = (msg) => {
    setPermToast(msg);
    setTimeout(() => setPermToast(null), 3500);
  };

  // ── Navigation protégée ───────────────────────────────────────────────────
  const goTo = (targetPage) => {
    const role         = localStorage.getItem("role") || "";
    const allowedRoles = PAGE_ROLES[targetPage];

    if (!allowedRoles) {
      setPage(targetPage);
      return;
    }
    if (allowedRoles.includes(role)) {
      setPage(targetPage);
    } else {
      showPermToast(`Accès refusé — page réservée à : ${allowedRoles.join(", ")}`);
      setPage("home");
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = (name, role) => {
    setUsername(name);
    localStorage.setItem("username", name);
    localStorage.setItem("role", role || "Utilisateur");
    const isAdmin = ["Administrateur Système", "Administrateur"].includes(role);
    setPage(isAdmin ? "admin" : "home");
  };

  // ── Logout ────────────────────────────────────────────────────────────────
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

  // ── Callback facture fournisseur : va vers InvoiceVerification ────────────
  const handleOcrDone = (data) => {
    setOcrData(data);
    setPage("verification");
  };

  // ── Callback note de frais : va vers ExpenseVerificationPage ─────────────
  // data = résultat complet de POST /receipts/upload
  const handleExpenseOcrDone = (data) => {
    setExpenseData(data);
    setPage("expense_verification");
  };

  // ── Retour depuis vérification facture ────────────────────────────────────
  const handleVerificationBack    = () => setPage("upload");
  const handleVerificationConfirm = (corrected) => {
    console.log("Facture validée :", corrected);
    setPage("home");
  };

  // ── Retour depuis vérification note de frais ──────────────────────────────
  const handleExpenseBack    = () => setPage("upload");
  const handleExpenseConfirm = (corrected) => {
    console.log("Note de frais validée :", corrected);
    setExpenseData(null);
    setPage("home");
  };

  return (
    <>
      <GlobalStyles />
      <Background />
      <Orbs />

      {/* ── Toast permission ──────────────────────────────────────────────── */}
      {permToast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 500,
          background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)",
          color: "#f87171", display: "flex", alignItems: "center", gap: 8,
          animation: "fade-in 0.3s ease", whiteSpace: "nowrap",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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

        {page === "login" && (
          <LoginPage onLogin={handleLogin} />
        )}

        {page === "home" && (
          <HomePage setPage={goTo} username={username} uploadedInvoices={uploadedInvoices} />
        )}

        {/* ← MODIFIÉ : addToArchive passé en prop à UploadPage */}
        {page === "upload" && (
          <UploadPage
            onUploaded={handleUploaded}
            onOcrDone={handleOcrDone}
            onExpenseOcrDone={handleExpenseOcrDone}
            addToArchive={addToArchive}
          />
        )}

        {page === "dashboard" && <DashboardPage />}

        {/* AdminPage reçoit setPage pour le lien vers BudgetAdminPage */}
        {page === "admin" && <AdminPage setPage={goTo} />}

        {/* ── Interface Administrateur Système ─────────────────────────── */}
        {page === "sysadmin" && <SystemAdminPage />}

        {/* ── Vérification facture fournisseur ────────────────────────── */}
        {page === "verification" && (
          <InvoiceVerification
            ocrData={ocrData}
            onBack={handleVerificationBack}
            onConfirm={handleVerificationConfirm}
          />
        )}

        {/* ── Vérification note de frais ───────────────────────────────── */}
        {page === "expense_verification" && (
          <ExpenseVerificationPage
            receiptData={expenseData}
            onBack={handleExpenseBack}
            onConfirm={handleExpenseConfirm}
          />
        )}

        {/* ── Archive des factures ← AJOUTÉ ────────────────────────────── */}
        {page === "archive" && (
          <ArchivePage
            archivedFiles={archivedFiles}
            removeFromArchive={removeFromArchive}
            clearArchive={clearArchive}
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