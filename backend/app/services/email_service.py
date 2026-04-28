#Quand un utilisateur atteint 80%, 90%, 95% ou dépasse son budget mensuel, 
# ce service envoie un bel email (avec design) aux admins pour les prévenir.
import os
from dotenv import load_dotenv
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text      import MIMEText
from datetime             import datetime
from typing               import List
load_dotenv()
logger = logging.getLogger(__name__)

# ── Config depuis l'environnement ─────────────────────────────────────────────
SMTP_HOST     = os.getenv("SMTP_HOST",     "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER",     "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS  = os.getenv("SMTP_USE_TLS",  "true").lower() == "true"

# Plusieurs admins possibles → séparez par des virgules dans .env
# Exemple : ADMIN_EMAIL=dg@vernicolor.tn,compta@vernicolor.tn
_raw_admin   = os.getenv("ADMIN_EMAIL", "admin@vernicolor.tn")
ADMIN_EMAILS: List[str] = [e.strip() for e in _raw_admin.split(",") if e.strip()]

APP_NAME      = os.getenv("APP_NAME", "VerniColor Tunisia")
APP_URL       = os.getenv("APP_URL",  "http://localhost:3000")


# ══════════════════════════════════════════════════════════════════════════════
# COULEURS / LABELS PAR NIVEAU
# ══════════════════════════════════════════════════════════════════════════════

_LEVEL_META = {
    "warning_80" : {"color": "#f59e0b", "label": "⚠ Alerte 80%",       "emoji": "⚠️"},
    "warning_90" : {"color": "#f97316", "label": "⚠ Alerte 90%",       "emoji": "🔶"},
    "warning_95" : {"color": "#ef4444", "label": "🚨 Alerte critique 95%", "emoji": "🚨"},
    "exceeded"   : {"color": "#ef4444", "label": "🚨 Seuil dépassé",   "emoji": "🚨"},
}

def _fmt(amount: float) -> str:
    return f"{amount:,.3f} TND".replace(",", " ")

#2 versions du même email
# ══════════════════════════════════════════════════════════════════════════════
# TEMPLATE HTML
# ══════════════════════════════════════════════════════════════════════════════
#Version belle avec design, couleurs, barre de progression, tableau... (celle que les admins verront)
def _build_html(username: str, user_email: str, pct: float,
                total: float, seuil: float, level: str) -> str:

    meta    = _LEVEL_META.get(level, _LEVEL_META["warning_95"])
    color   = meta["color"]
    label   = meta["label"]
    emoji   = meta["emoji"]
    restant = max(0.0, seuil - total)
    now_str = datetime.now().strftime("%d/%m/%Y à %H:%M")

    # Barre de progression HTML (compatible Outlook)
    bar_pct     = min(pct, 100)
    bar_color   = color

    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

        <!-- En-tête -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f1e3d,#1e3a6e);padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);
                             letter-spacing:0.12em;text-transform:uppercase;">
                    {APP_NAME} · Système de gestion budgétaire
                  </p>
                  <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">
                    {emoji} Alerte Budget — Notes de frais
                  </h1>
                </td>
                <td align="right" style="vertical-align:top;">
                  <span style="display:inline-block;padding:6px 14px;border-radius:20px;
                               background:{color}22;border:1px solid {color}55;
                               font-size:12px;font-weight:600;color:{color};">
                    {label}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:28px 32px;">

            <!-- Intro -->
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
              Bonjour,<br><br>
              L'utilisateur <strong style="color:#1e3a6e;">{username}</strong>
              (<a href="mailto:{user_email}" style="color:#3b82f6;">{user_email}</a>)
              a atteint <strong>{pct:.1f}%</strong> de son plafond mensuel de notes de frais.
              L'upload reste autorisé, mais votre attention est requise.
            </p>

            <!-- Barre de progression -->
            <p style="margin:0 0 8px;font-size:12px;color:#6b7280;font-weight:600;
                      text-transform:uppercase;letter-spacing:0.05em;">
              Utilisation du seuil
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#e5e7eb;border-radius:8px;height:14px;overflow:hidden;margin-bottom:6px;">
              <tr>
                <td width="{bar_pct}%"
                    style="background:linear-gradient(90deg,#1e3a6e,{bar_color});
                           border-radius:8px;height:14px;"></td>
                <td></td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;text-align:right;">
              {bar_pct:.1f}% utilisé
            </p>

            <!-- Tableau des montants -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f9fafb;">
                <td style="padding:14px 20px;font-size:12px;font-weight:600;
                           color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;
                           border-bottom:1px solid #e5e7eb;">Indicateur</td>
                <td style="padding:14px 20px;font-size:12px;font-weight:600;
                           color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;
                           border-bottom:1px solid #e5e7eb;text-align:right;">Montant</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;font-size:14px;color:#374151;
                           border-bottom:1px solid #f3f4f6;">Plafond mensuel</td>
                <td style="padding:14px 20px;font-size:14px;font-weight:700;
                           color:#1e3a6e;text-align:right;
                           border-bottom:1px solid #f3f4f6;">{_fmt(seuil)}</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;font-size:14px;color:#374151;
                           border-bottom:1px solid #f3f4f6;">Total dépensé (mois)</td>
                <td style="padding:14px 20px;font-size:14px;font-weight:700;
                           color:{color};text-align:right;
                           border-bottom:1px solid #f3f4f6;">{_fmt(total)}</td>
              </tr>
              <tr>
                <td style="padding:14px 20px;font-size:14px;color:#374151;">Solde restant</td>
                <td style="padding:14px 20px;font-size:14px;font-weight:700;
                           color:{'#ef4444' if restant <= 0 else '#10b981'};text-align:right;">
                  {_fmt(restant) if restant > 0 else "⛔ Dépassé"}
                </td>
              </tr>
            </table>

            <!-- Note métier -->
            <div style="padding:16px 20px;background:#fef3c7;border-left:4px solid #f59e0b;
                        border-radius:0 8px 8px 0;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                <strong>Note :</strong> L'upload des notes de frais est maintenu.
                Aucun blocage n'est appliqué. Cette alerte est informative.
                Vous pouvez ajuster le plafond dans l'interface administrateur.
              </p>
            </div>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;
                           background:linear-gradient(135deg,#1e3a6e,#3b82f6);">
                  <a href="{APP_URL}/admin" target="_blank"
                     style="display:inline-block;padding:13px 28px;font-size:14px;
                            font-weight:600;color:#ffffff;text-decoration:none;
                            border-radius:10px;">
                    Voir l'espace administrateur →
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Pied de page -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;
                     background:#f9fafb;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              Alerte générée automatiquement le {now_str} · {APP_NAME}<br>
              Cet email est envoyé à l'équipe d'administration uniquement.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>"""

#Version texte simple (au cas où l’email HTML ne s’affiche pas)
def _build_plain(username: str, user_email: str, pct: float,
                 total: float, seuil: float, level: str) -> str:
    """Version texte brut (fallback)."""
    restant = max(0.0, seuil - total)
    now_str = datetime.now().strftime("%d/%m/%Y à %H:%M")
    label   = _LEVEL_META.get(level, _LEVEL_META["warning_95"])["label"]
    return f"""
{APP_NAME} — ALERTE BUDGET ({label})
====================================

Utilisateur : {username} ({user_email})
Date        : {now_str}

SEUIL ATTEINT : {pct:.1f}%

  Plafond mensuel  : {_fmt(seuil)}
  Total dépensé    : {_fmt(total)}
  Solde restant    : {_fmt(restant) if restant > 0 else "Dépassé"}

NOTE : L'upload des notes de frais reste autorisé.
Cette alerte est informative — aucun blocage n'est appliqué.

Accès admin : {APP_URL}/admin

---
Email généré automatiquement — {APP_NAME}
"""


# ══════════════════════════════════════════════════════════════════════════════
# FONCTION PRINCIPALE — à appeler depuis budget_controller.py
# ══════════════════════════════════════════════════════════════════════════════

def send_budget_alert_email(
    username   : str,
    user_email : str,
    pct        : float,
    total      : float,
    seuil      : float,
    level      : str,
) -> bool:
    #Vérifie que l’email et le mot de passe sont configurés
    # Crée un email avec un beau design HTML
    # Se connecte à Gmail (ou autre serveur SMTP)
    # Envoie l’email aux admins
    # Retourne True si envoyé avec succès, False sinon
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(
            "[BudgetAlert] SMTP non configuré (SMTP_USER / SMTP_PASSWORD manquants). "
            "Email non envoyé pour %s @ %.1f%%", username, pct
        )
        return False

    if not ADMIN_EMAILS:
        logger.warning("[BudgetAlert] Aucun ADMIN_EMAIL configuré.")
        return False

    meta    = _LEVEL_META.get(level, _LEVEL_META["warning_95"])
    subject = (
        f"{meta['emoji']} [{APP_NAME}] Alerte budget {pct:.1f}% — {username}"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{APP_NAME} Alerts <{SMTP_USER}>"
    msg["To"]      = ", ".join(ADMIN_EMAILS)

    # Texte brut en premier (fallback), HTML en second (prioritaire)
    msg.attach(MIMEText(_build_plain(username, user_email, pct, total, seuil, level), "plain", "utf-8"))
    msg.attach(MIMEText(_build_html( username, user_email, pct, total, seuil, level), "html",  "utf-8"))

    try:
        if SMTP_USE_TLS:
            # Port 587 — STARTTLS
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, ADMIN_EMAILS, msg.as_string())
        else:
            # Port 465 — SSL direct
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, ADMIN_EMAILS, msg.as_string())

        logger.info(
            "[BudgetAlert] Email envoyé → %s | user=%s pct=%.1f%%",
            ADMIN_EMAILS, username, pct
        )
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error("[BudgetAlert] Échec auth SMTP — vérifiez SMTP_USER/SMTP_PASSWORD.")
    except smtplib.SMTPConnectError:
        logger.error("[BudgetAlert] Impossible de se connecter à %s:%s", SMTP_HOST, SMTP_PORT)
    except Exception as exc:
        logger.error("[BudgetAlert] Erreur inattendue : %s", exc)

    return False


# ── Envoi asynchrone (optionnel — évite de bloquer la réponse API) ─────────────
import threading

def send_budget_alert_email_async(
    username: str, user_email: str,
    pct: float, total: float, seuil: float, level: str,
) -> None:
    """
    Lance l'envoi d'email dans un thread séparé.
    La réponse API n'attend pas la fin de l'envoi SMTP.

    Remplacer send_budget_alert_email(...) par
    send_budget_alert_email_async(...) dans budget_controller.py
    pour des temps de réponse plus rapides.
    """
    t = threading.Thread(
        target=send_budget_alert_email,
        args=(username, user_email, pct, total, seuil, level),
        daemon=True,
    )
    t.start()