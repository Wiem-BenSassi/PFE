// ─── src/pages/SystemAdminPage.jsx ───────────────────────────────────────────
// Interface complète pour l'Administrateur Système.
// Sections : Gestion Utilisateurs · Gestion Rôles · Gestion Seuils
// Design cohérent avec AdminPage.jsx et le reste de l'application.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config/api";

const API = `${API_BASE_URL}/sysadmin`;

// ── Rôles disponibles dans le système (4 rôles uniquement) ──────────────────
const ROLES_LIST = [
  "Administrateur Système",
  "Administrateur",
  "Comptable",
  "Utilisateur",
];

// ── Couleurs : uniquement jaune, vert et bleu ─────────────────────────────────
const roleColor = (role) => ({
  "Administrateur Système" : "#3b82f6",   // bleu
  "Administrateur"         : "#facc15",   // jaune
  "Comptable"              : "#10b981",   // vert
  "Utilisateur"            : "#3b82f6",   // bleu
}[role] || "#3b82f6");

// ── Helper fetch ──────────────────────────────────────────────────────────────
const apiFetch = (url, opts = {}) =>
  fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Username"  : localStorage.getItem("username") || "",
      ...(opts.headers || {}),
    },
  });

// ── Composant Toast ───────────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  if (!toast) return null;
  const isErr = toast.type === "error";
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 500,
      background: isErr ? "rgba(248,113,113,0.15)" : "rgba(16,185,129,0.15)",
      border: `1px solid ${isErr ? "rgba(248,113,113,0.4)" : "rgba(16,185,129,0.4)"}`,
      color: isErr ? "#f87171" : "#10b981",
      display: "flex", alignItems: "center", gap: 8,
      animation: "fade-in 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      maxWidth: 400,
    }}>
      {isErr ? "✕" : "✓"} {toast.msg}
    </div>
  );
};

// ── Modale de confirmation suppression ────────────────────────────────────────
const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onCancel}>
      <div style={{
        background: "linear-gradient(145deg,#0d1627,#0a1120)",
        border: "1px solid rgba(37,99,235,0.35)",
        borderRadius: 20, padding: "32px 36px", maxWidth: 380, width: "90%",
        textAlign: "center",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>
          ⚠
        </div>
        <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 700, color: "#e8f0ff", marginBottom: 8 }}>
          Confirmer la suppression
        </p>
        <p style={{ fontSize: 14, color: "#5a6e99", lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "9px 22px", borderRadius: 10, fontSize: 13, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#5a6e99", cursor: "pointer", fontFamily: "'Syne',sans-serif", fontWeight: 600 }}>
            Annuler
          </button>
          <button onClick={onConfirm} style={{ padding: "9px 22px", borderRadius: 10, fontSize: 13, background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.4)", color: "#60a5fa", cursor: "pointer", fontFamily: "'Syne',sans-serif", fontWeight: 600 }}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Style commun card ─────────────────────────────────────────────────────────
const card = {
  background  : "rgba(255,255,255,0.03)",
  border      : "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  boxShadow   : "0 8px 40px rgba(0,0,0,0.4)",
};

// ── Style input ───────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)", color: "#e8f0ff",
  fontSize: 13, outline: "none", boxSizing: "border-box",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "auto",
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function SystemAdminPage() {

  // ── Onglet actif ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState("users"); // "users" | "roles" | "thresholds"

  // ── Données ─────────────────────────────────────────────────────────────────
  const [users,      setUsers]      = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [loading,    setLoading]    = useState(false);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Modale confirmation ──────────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState({ open: false, message: "", onConfirm: null });
  const openConfirm = (message, onConfirm) => setConfirmModal({ open: true, message, onConfirm });
  const closeConfirm = () => setConfirmModal({ open: false, message: "", onConfirm: null });

  // ── Modal utilisateur (ajout / modification) ─────────────────────────────────
  const EMPTY_USER = { username: "", email: "", password: "", role: "Utilisateur" };
  const [userModal, setUserModal] = useState({ open: false, mode: "add", data: EMPTY_USER, editId: null });

  // ── Modal seuil (ajout) ──────────────────────────────────────────────────────
  const EMPTY_THRESHOLD = { role_name: "Utilisateur", max_amount_tnd: "", auto_approve_below_tnd: "", is_active: true };
  const [thresholdModal, setThresholdModal] = useState({ open: false, data: EMPTY_THRESHOLD });

  // ── Recherche utilisateurs ───────────────────────────────────────────────────
  const [searchUsers, setSearchUsers] = useState("");

  // ── Chargement initial ───────────────────────────────────────────────────────
  useEffect(() => { loadUsers(); loadThresholds(); }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES
  // ─────────────────────────────────────────────────────────────────────────────

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/users`);
      const data = await res.json();
      if (res.ok) setUsers(Array.isArray(data) ? data : []);
      else showToast(data.detail || "Erreur chargement utilisateurs", "error");
    } catch { showToast("Erreur réseau", "error"); }
    setLoading(false);
  };

  const loadThresholds = async () => {
    try {
      const res = await apiFetch(`${API}/thresholds`);
      const data = await res.json();
      if (res.ok) setThresholds(Array.isArray(data) ? data : []);
    } catch {}
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILISATEURS — CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  const saveUser = async () => {
    const { mode, data, editId } = userModal;

    // Validation basique
    if (!data.username.trim() || !data.email.trim()) {
      showToast("Nom et email sont obligatoires.", "error"); return;
    }
    if (mode === "add" && !data.password.trim()) {
      showToast("Le mot de passe est obligatoire pour un nouvel utilisateur.", "error"); return;
    }

    try {
      const url    = mode === "add" ? `${API}/users` : `${API}/users/${editId}`;
      const method = mode === "add" ? "POST" : "PUT";

      const payload = mode === "add"
        ? data
        : { username: data.username, email: data.email, role: data.role, ...(data.password ? { password: data.password } : {}) };

      const res  = await apiFetch(url, { method, body: JSON.stringify(payload) });
      const resp = await res.json();

      if (res.ok) {
        showToast(resp.message || (mode === "add" ? "Utilisateur créé ✓" : "Utilisateur mis à jour ✓"));
        setUserModal(m => ({ ...m, open: false }));
        loadUsers();
      } else {
        showToast(resp.detail || "Erreur", "error");
      }
    } catch { showToast("Erreur réseau", "error"); }
  };

  const deleteUser = (user) => {
    openConfirm(
      `Supprimer définitivement l'utilisateur "${user.username}" (${user.email}) ?`,
      async () => {
        closeConfirm();
        try {
          const res = await apiFetch(`${API}/users/${user.id}`, { method: "DELETE" });
          const data = await res.json();
          if (res.ok) { showToast(data.message || "Utilisateur supprimé ✓"); loadUsers(); }
          else showToast(data.detail || "Erreur suppression", "error");
        } catch { showToast("Erreur réseau", "error"); }
      }
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SEUILS — CRÉATION / SUPPRESSION
  // ─────────────────────────────────────────────────────────────────────────────

  const saveThreshold = async () => {
    const { data } = thresholdModal;

    if (!data.max_amount_tnd || isNaN(parseFloat(data.max_amount_tnd))) {
      showToast("Le plafond maximum est obligatoire.", "error"); return;
    }
    if (data.auto_approve_below_tnd && parseFloat(data.auto_approve_below_tnd) > parseFloat(data.max_amount_tnd)) {
      showToast("L'auto-approbation ne peut pas dépasser le plafond.", "error"); return;
    }

    try {
      const res = await apiFetch(`${API}/thresholds`, {
        method: "POST",
        body  : JSON.stringify({
          role_name              : data.role_name,
          max_amount_tnd         : parseFloat(data.max_amount_tnd),
          auto_approve_below_tnd : parseFloat(data.auto_approve_below_tnd) || 0,
          is_active              : data.is_active,
        }),
      });
      const resp = await res.json();

      if (res.ok) {
        showToast(resp.message || "Seuil créé ✓");
        setThresholdModal(m => ({ ...m, open: false }));
        loadThresholds();
      } else {
        showToast(resp.detail || "Erreur création seuil", "error");
      }
    } catch { showToast("Erreur réseau", "error"); }
  };

  const deleteThreshold = (t) => {
    openConfirm(
      `Supprimer le seuil pour le rôle "${t.role_name}" (${t.max_amount_tnd} TND) ?`,
      async () => {
        closeConfirm();
        try {
          const res = await apiFetch(`${API}/thresholds/${t.id}`, { method: "DELETE" });
          const data = await res.json();
          if (res.ok) { showToast(data.message || "Seuil supprimé ✓"); loadThresholds(); }
          else showToast(data.detail || "Erreur suppression", "error");
        } catch { showToast("Erreur réseau", "error"); }
      }
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FILTRAGE UTILISATEURS
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUsers.toLowerCase()) ||
    (u.role || "").toLowerCase().includes(searchUsers.toLowerCase())
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", padding: "80px 28px 48px", position: "relative", zIndex: 1 }}>

      <Toast toast={toast} />

      <ConfirmModal
        isOpen={confirmModal.open}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />

      {/* ── Modal Utilisateur ─────────────────────────────────────────────── */}
      {userModal.open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setUserModal(m => ({ ...m, open: false }))}>
          <div style={{ ...card, padding: "32px 36px", maxWidth: 460, width: "92%", borderRadius: 20 }}
            onClick={e => e.stopPropagation()}>

            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "#e8f0ff", marginBottom: 24 }}>
              {userModal.mode === "add" ? "➕ Ajouter un utilisateur" : "✏️ Modifier l'utilisateur"}
            </p>

            {/* Champs du formulaire */}
            {[
              { key: "username", label: "Nom d'utilisateur", type: "text", placeholder: "ex: Wiem_BenSassi" },
              { key: "email",    label: "Adresse email",     type: "email", placeholder: "exemple@vernicolor.tn" },
              { key: "password", label: "Mot de passe",      type: "password", placeholder: userModal.mode === "edit" ? "Laisser vide pour ne pas changer" : "Mot de passe" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, color: "#5a6e99", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {label} {key !== "password" && <span style={{ color: "#f87171" }}>*</span>}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={userModal.data[key]}
                  onChange={e => setUserModal(m => ({ ...m, data: { ...m.data, [key]: e.target.value } }))}
                  style={inputStyle}
                />
              </div>
            ))}

            {/* Sélecteur de rôle */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, color: "#5a6e99", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Rôle <span style={{ color: "#f87171" }}>*</span>
              </label>
              <select
                value={userModal.data.role}
                onChange={e => setUserModal(m => ({ ...m, data: { ...m.data, role: e.target.value } }))}
                style={selectStyle}
              >
                {ROLES_LIST.map(r => (
                  <option key={r} value={r} style={{ background: "#0d1627" }}>{r}</option>
                ))}
              </select>
              {/* Badge couleur du rôle sélectionné */}
              <span style={{ display: "inline-block", marginTop: 6, fontSize: 11, padding: "2px 10px", borderRadius: 20, background: `${roleColor(userModal.data.role)}18`, color: roleColor(userModal.data.role), border: `1px solid ${roleColor(userModal.data.role)}44`, fontWeight: 500 }}>
                {userModal.data.role}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setUserModal(m => ({ ...m, open: false }))}
                style={{ padding: "9px 20px", borderRadius: 9, fontSize: 13, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#5a6e99", cursor: "pointer", fontFamily: "'Syne',sans-serif", fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={saveUser}
                style={{ padding: "9px 22px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.4)", color: "#60a5fa", cursor: "pointer", fontFamily: "'Syne',sans-serif" }}>
                {userModal.mode === "add" ? "Créer l'utilisateur" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Seuil ───────────────────────────────────────────────────── */}
      {thresholdModal.open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setThresholdModal(m => ({ ...m, open: false }))}>
          <div style={{ ...card, padding: "32px 36px", maxWidth: 440, width: "92%", borderRadius: 20 }}
            onClick={e => e.stopPropagation()}>

            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "#e8f0ff", marginBottom: 24 }}>
              ➕ Créer un seuil
            </p>

            {/* Rôle cible */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: "#5a6e99", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Rôle cible <span style={{ color: "#f87171" }}>*</span>
              </label>
              <select
                value={thresholdModal.data.role_name}
                onChange={e => setThresholdModal(m => ({ ...m, data: { ...m.data, role_name: e.target.value } }))}
                style={selectStyle}
              >
                {ROLES_LIST.map(r => (
                  <option key={r} value={r} style={{ background: "#0d1627" }}>{r}</option>
                ))}
              </select>
            </div>

            {/* Plafond max */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: "#5a6e99", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Plafond maximum (TND) <span style={{ color: "#f87171" }}>*</span>
              </label>
              <input
                type="number" min="0" step="0.001"
                placeholder="ex: 500.000"
                value={thresholdModal.data.max_amount_tnd}
                onChange={e => setThresholdModal(m => ({ ...m, data: { ...m.data, max_amount_tnd: e.target.value } }))}
                style={inputStyle}
              />
            </div>

            {/* Auto-approbation */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: "#5a6e99", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Auto-approbation en-dessous de (TND)
              </label>
              <input
                type="number" min="0" step="0.001"
                placeholder="ex: 100.000"
                value={thresholdModal.data.auto_approve_below_tnd}
                onChange={e => setThresholdModal(m => ({ ...m, data: { ...m.data, auto_approve_below_tnd: e.target.value } }))}
                style={inputStyle}
              />
              <p style={{ fontSize: 11, color: "#5a6e99", marginTop: 4 }}>
                Les dépenses inférieures à ce montant seront auto-approuvées.
              </p>
            </div>

            {/* Actif / Inactif */}
            <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                <div
                  onClick={() => setThresholdModal(m => ({ ...m, data: { ...m.data, is_active: !m.data.is_active } }))}
                  style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${thresholdModal.data.is_active ? "#10b981" : "rgba(255,255,255,0.15)"}`, background: thresholdModal.data.is_active ? "#059669" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                >
                  {thresholdModal.data.is_active && <svg width="10" height="10" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                </div>
                <span style={{ fontSize: 13, color: "#c0cfee" }}>Activer ce seuil immédiatement</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setThresholdModal(m => ({ ...m, open: false }))}
                style={{ padding: "9px 20px", borderRadius: 9, fontSize: 13, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#5a6e99", cursor: "pointer", fontFamily: "'Syne',sans-serif", fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={saveThreshold}
                style={{ padding: "9px 22px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981", cursor: "pointer", fontFamily: "'Syne',sans-serif" }}>
                Créer le seuil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE PRINCIPALE
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── En-tête ───────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: "#5a6e99", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Administration Système
          </p>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: "#e8f0ff", marginBottom: 6, letterSpacing: "-0.3px" }}>
            Gestion <span style={{ color: "#3b82f6" }}>Système</span>
          </h1>
          <p style={{ color: "#5a6e99", fontSize: 14 }}>
            Utilisateurs · Rôles · Seuils — accès exclusif Administrateur Système.
          </p>
        </div>

        {/* ── Cartes KPI rapides ────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 32 }}>
          {[
            { label: "Utilisateurs", value: users.length,      color: "#3b82f6" },
            { label: "Rôles",        value: ROLES_LIST.length,  color: "#8b5cf6" },
            { label: "Seuils",       value: thresholds.length,  color: "#10b981" },
            { label: "Seuils actifs",value: thresholds.filter(t => t.is_active).length, color: "#f59e0b" },
          ].map((k, i) => (
            <div key={i} style={{ ...card, padding: "18px 20px" }}>
              <p style={{ fontSize: 11, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{k.label}</p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 700, color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Onglets ───────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[
            { key: "users",      label: "👥 Utilisateurs" },
            { key: "roles",      label: "🏷️ Rôles"        },
            { key: "thresholds", label: "⚡ Seuils"       },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
              border    : `1px solid ${tab === t.key ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.07)"}`,
              background: tab === t.key ? "rgba(37,99,235,0.12)" : "transparent",
              color     : tab === t.key ? "#60a5fa" : "#5a6e99",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            ONGLET 1 : GESTION DES UTILISATEURS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === "users" && (
          <div style={{ ...card, overflow: "hidden" }}>

            {/* En-tête tableau + barre recherche + bouton ajouter */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "#e8f0ff" }}>
                  Utilisateurs <span style={{ fontSize: 13, color: "#5a6e99", fontWeight: 400 }}>({filteredUsers.length}/{users.length})</span>
                </p>
                <button onClick={() => setUserModal({ open: true, mode: "add", data: EMPTY_USER, editId: null })}
                  style={{ padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.35)", color: "#60a5fa", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  + Ajouter un utilisateur
                </button>
              </div>

              {/* Barre de recherche */}
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a6e99" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  value={searchUsers}
                  onChange={e => setSearchUsers(e.target.value)}
                  placeholder="Rechercher par nom, email ou rôle…"
                  style={{ ...inputStyle, paddingLeft: 36 }}
                />
                {searchUsers && (
                  <button onClick={() => setSearchUsers("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#5a6e99", fontSize: 16 }}>×</button>
                )}
              </div>
            </div>

            {/* Tableau */}
            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#5a6e99" }}>Chargement…</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#5a6e99", fontSize: 13 }}>
                {searchUsers ? `Aucun résultat pour « ${searchUsers} »` : "Aucun utilisateur trouvé."}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {["#", "Nom", "Email", "Rôle", "Actions"].map(h => (
                        <th key={h} style={{ padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(37,99,235,0.04)"}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent"}
                      >
                        {/* ID */}
                        <td style={{ padding: "13px 20px", fontSize: 12, color: "#3a4d72" }}>#{u.id}</td>

                        {/* Avatar + Nom */}
                        <td style={{ padding: "13px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${roleColor(u.role)}22`, border: `1px solid ${roleColor(u.role)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: roleColor(u.role), flexShrink: 0 }}>
                              {(u.username || "?").charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "#e8f0ff" }}>{u.username}</span>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ padding: "13px 20px", fontSize: 13, color: "#5a6e99" }}>{u.email}</td>

                        {/* Rôle — badge coloré en JAUNE */}
                        <td style={{ padding: "13px 20px" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#facc15" }}>
                            {u.role}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "13px 20px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            {/* Modifier */}
                            <button
                              onClick={() => setUserModal({
                                open: true, mode: "edit",
                                data: { username: u.username, email: u.email, password: "", role: u.role },
                                editId: u.id,
                              })}
                              style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)", color: "#60a5fa", cursor: "pointer" }}
                            >
                              Modifier
                            </button>

                            {/* Supprimer */}
                            <button
                              onClick={() => deleteUser(u)}
                              style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.25)", color: "#60a5fa", cursor: "pointer" }}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ONGLET 2 : GESTION DES RÔLES
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === "roles" && (
          <div>
            <div style={{ ...card, padding: "24px", marginBottom: 20 }}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "#e8f0ff", marginBottom: 4 }}>
                Rôles du système
              </p>
              <p style={{ fontSize: 13, color: "#5a6e99", marginBottom: 20 }}>
                Liste des rôles disponibles et leurs permissions associées.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {[
                  { role: "Administrateur Système", desc: "Accès total : utilisateurs, rôles, seuils, analytics", perms: ["Gestion utilisateurs", "Création seuils", "Dashboard", "Admin panel"] },
                  { role: "Administrateur",         desc: "Gestion des seuils + analytics métier",                perms: ["Modification seuils", "Dashboard", "Admin panel"] },
                  { role: "Comptable",              desc: "Upload factures fournisseurs + dashboard financier",    perms: ["Upload factures", "Dashboard", "Notes de frais"] },
                  { role: "Utilisateur",            desc: "Utilisateur standard — notes de frais uniquement",     perms: ["Notes de frais"] },
                ].map(({ role, desc, perms }) => {
                  const count = users.filter(u => u.role === role).length;
                  return (
                    <div key={role} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${roleColor(role)}22`, borderRadius: 12, padding: "16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: roleColor(role), flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#facc15" }}>{role}</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "#5a6e99" }}>
                          {count} user{count > 1 ? "s" : ""}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "#5a6e99", marginBottom: 10, lineHeight: 1.5 }}>{desc}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {perms.map(p => (
                          <span key={p} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: `${roleColor(role)}14`, color: roleColor(role), border: `1px solid ${roleColor(role)}33` }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distribution des rôles */}
            <div style={{ ...card, padding: "24px" }}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#e8f0ff", marginBottom: 16 }}>
                Distribution des utilisateurs par rôle
              </p>
              {ROLES_LIST.map(role => {
                const count = users.filter(u => u.role === role).length;
                const pct   = users.length > 0 ? (count / users.length) * 100 : 0;
                return (
                  <div key={role} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "#facc15", fontWeight: 600 }}>{role}</span>
                      <span style={{ fontSize: 12, color: "#5a6e99" }}>{count} utilisateur{count > 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: roleColor(role), borderRadius: 3, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ONGLET 3 : GESTION DES SEUILS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === "thresholds" && (
          <div>
            {/* Note explicative */}
            <div style={{ ...card, padding: "16px 20px", marginBottom: 20, borderLeft: "3px solid rgba(250,204,21,0.6)", borderRadius: "0 12px 12px 0" }}>
              <p style={{ fontSize: 13, color: "#fde68a", fontWeight: 500, marginBottom: 4 }}>
                ⚡ Création de seuils — Administrateur Système uniquement
              </p>
              <p style={{ fontSize: 12, color: "#5a6e99", lineHeight: 1.5 }}>
                L'Administrateur (métier) peut modifier et activer/désactiver les seuils existants via le panel Admin.
                Seul l'Administrateur Système peut créer ou supprimer des seuils.
              </p>
            </div>

            <div style={{ ...card, overflow: "hidden" }}>
              {/* En-tête + bouton créer */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: "#e8f0ff" }}>
                  Seuils de remboursement <span style={{ fontSize: 13, color: "#5a6e99", fontWeight: 400 }}>({thresholds.length})</span>
                </p>
                <button onClick={() => setThresholdModal({ open: true, data: EMPTY_THRESHOLD })}
                  style={{ padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)", color: "#10b981", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  + Créer un seuil
                </button>
              </div>

              {/* Tableau des seuils */}
              {thresholds.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "#5a6e99", fontSize: 13 }}>
                  Aucun seuil défini. Cliquez sur "Créer un seuil" pour commencer.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {["Rôle", "Plafond max (TND)", "Auto-approbation (TND)", "Statut", "Dernière màj", "Actions"].map(h => (
                          <th key={h} style={{ padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#5a6e99", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {thresholds.map((t, i) => (
                        <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>

                          {/* Rôle en jaune */}
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#facc15" }}>
                              {t.role_name}
                            </span>
                          </td>

                          {/* Plafond */}
                          <td style={{ padding: "14px 20px", fontSize: 14, color: "#e8f0ff", fontFamily: "'Syne',sans-serif", fontWeight: 600 }}>
                            {t.max_amount_tnd.toFixed(3)} TND
                          </td>

                          {/* Auto-approbation */}
                          <td style={{ padding: "14px 20px", fontSize: 13, color: "#c0cfee" }}>
                            {t.auto_approve_below_tnd.toFixed(3)} TND
                          </td>

                          {/* Statut */}
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: t.is_active ? "rgba(16,185,129,0.12)" : "rgba(37,99,235,0.12)",
                              color: t.is_active ? "#10b981" : "#60a5fa",
                              border: `1px solid ${t.is_active ? "rgba(16,185,129,0.3)" : "rgba(37,99,235,0.3)"}`,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.is_active ? "#10b981" : "#3b82f6" }} />
                              {t.is_active ? "Actif" : "Inactif"}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={{ padding: "14px 20px", fontSize: 12, color: "#3a4d72" }}>
                            {t.updated_at ? t.updated_at.substring(0, 10) : "—"}
                          </td>

                          {/* Action supprimer */}
                          <td style={{ padding: "14px 20px" }}>
                            <button
                              onClick={() => deleteThreshold(t)}
                              style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.25)", color: "#60a5fa", cursor: "pointer" }}
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}