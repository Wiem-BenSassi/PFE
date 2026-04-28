#contrôle budgétaire des notes de frais dans l’application VerniColor.
#contrôler les dépenses des employés en notes de frais (expense_receipts).
#Envoyer des alertes automatiques par email aux administrateurs quand un utilisateur approche ou dépasse son plafond.
#Ne plus bloquer l’upload des notes de frais (même si le budget est dépassé) 
# → c’est une décision métier.
from fastapi        import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy     import text
from pydantic       import BaseModel
from typing         import Optional

from app.database.connection       import get_db
from auth.rbac                     import get_current_user, ROLES

# Import du service email 
try:
    from app.services.email_service import send_budget_alert_email_async as _send_alert_email

    _EMAIL_ENABLED = True
except ImportError:
    _EMAIL_ENABLED = False
    import logging
    logging.getLogger(__name__).warning(
        "[Budget] app/services/email_service.py introuvable — alertes email désactivées."
    )
    print(f"✅ EMAIL_ENABLED = {_EMAIL_ENABLED}")

router = APIRouter()

ADMIN_ROLES = [ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER]

# Paliers qui déclenchent un email vers les admins
EMAIL_ALERT_LEVELS = {"warning_95", "exceeded"}


# ══════════════════════════════════════════════════════════════════════════════
# INIT TABLES
# ══════════════════════════════════════════════════════════════════════════════

def ensure_budget_tables(db: Session):
    """Crée user_budgets et budget_alerts si absentes."""
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS user_budgets (
            id          SERIAL PRIMARY KEY,
            user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            seuil_max   NUMERIC(14,3) NOT NULL,
            period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
            notes       TEXT,
            created_by  INTEGER REFERENCES users(id),
            created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS budget_alerts (
            id           SERIAL PRIMARY KEY,
            user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            alert_type   VARCHAR(30) NOT NULL,
            amount_tnd   NUMERIC(14,3),
            seuil        NUMERIC(14,3),
            pct_used     NUMERIC(6,2),
            email_sent   BOOLEAN NOT NULL DEFAULT FALSE,
            acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
            ack_by       INTEGER REFERENCES users(id),
            created_at   TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))
    db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _resolve_user(x_username: Optional[str], db: Session) -> tuple:
    if not x_username:
        row = db.execute(text(
            "SELECT id, username, role, email FROM users WHERE is_active=TRUE ORDER BY id LIMIT 1"
        )).fetchone()
    else:
        row = db.execute(text(
            "SELECT id, username, role, email FROM users WHERE username=:u OR email=:u LIMIT 1"
        ), {"u": x_username}).fetchone()
    if not row:
        raise HTTPException(404, "Utilisateur introuvable.")
    return row[0], row[1], row[2], row[3]

#Cette fonction cherche le plafond budgétaire de l’utilisateur. 
# Elle cherche d’abord un seuil spécial pour lui, sinon elle prend celui de son rôle.
def _get_seuil(user_id: int, role: str, db: Session) -> tuple:
    """
    Retourne (seuil_max, source).
    Priorité : user_budgets > expense_thresholds > fallback 100 000
    """
    r = db.execute(text(
        "SELECT seuil_max FROM user_budgets WHERE user_id=:uid LIMIT 1"
    ), {"uid": user_id}).fetchone()
    if r:
        return float(r[0]), "user"

    r = db.execute(text("""
        SELECT max_amount_tnd FROM expense_thresholds
        WHERE role_name=:role AND is_active=TRUE LIMIT 1
    """), {"role": role}).fetchone()
    if r:
        return float(r[0]), "role"

    return 100_000.0, "default"

#Elle calcule combien l’utilisateur a dépensé ce mois-ci uniquement en notes de frais. 
#Les factures fournisseurs ne sont pas comptées dans le budget.
def _total_expenses_this_month(user_id: int, db: Session) -> float:
    """
    ⚠️ expense_receipts SEULEMENT — supplier_invoices EXCLU.
    Somme des notes de frais validées/en attente du mois courant.
    """
    r = db.execute(text("""
        SELECT COALESCE(SUM(total_amount_tnd), 0)
        FROM expense_receipts
        WHERE submitted_by = :uid
          AND status IN ('pending', 'validated', 'auto_approved')
          AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR  FROM created_at) = EXTRACT(YEAR  FROM NOW())
    """), {"uid": user_id}).fetchone()
    return float(r[0]) if r else 0.0


def _total_invoices_this_month(user_id: int, db: Session) -> float:
    """Factures fournisseur du mois — AFFICHAGE INFORMATIF UNIQUEMENT, hors calcul seuil."""
    r = db.execute(text("""
        SELECT COALESCE(SUM(si.total_ttc_tnd), 0)
        FROM supplier_invoices si
        JOIN documents d ON d.id = si.document_id
        WHERE d.uploaded_by = :uid
          AND si.status IN ('pending', 'validated')
          AND EXTRACT(MONTH FROM si.created_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR  FROM si.created_at) = EXTRACT(YEAR  FROM NOW())
    """), {"uid": user_id}).fetchone()
    return float(r[0]) if r else 0.0
#Selon le pourcentage utilisé, elle retourne le niveau d’alerte.
#Le palier 95% est très important car c’est à partir de là que l’email est envoyé.
def _alert_level(pct: float) -> str:
    """
    Paliers d'alerte :
      ≥ 100% → exceeded
      ≥  95% → warning_95   ← NOUVEAU (déclenche email)
      ≥  90% → warning_90
      ≥  80% → warning_80
      <  80% → ok
    """
    if pct >= 100: return "exceeded"
    if pct >= 95:  return "warning_95"   
    if pct >= 90:  return "warning_90"
    if pct >= 80:  return "warning_80"
    return "ok"

#Quand le niveau atteint 95% ou plus, cette fonction :
#Enregistre l’alerte dans la base de données.
#Envoie un email aux administrateurs (en arrière-plan).
def _save_alert(
    user_id: int, level: str, amount: float, seuil: float,
    pct: float, username: str, email: str, db: Session
):
    """
    Insère une alerte en base si elle n'existe pas encore ce mois.
    Envoie un email aux admins pour les niveaux ≥ 95%.
    """
    print(f"🔍 _save_alert appelé — level={level}, user={username}, pct={pct}")
    
    if level == "ok":
        print("⏭ level=ok, rien à faire")
        return

    existing = db.execute(text("""
        SELECT id, email_sent FROM budget_alerts
        WHERE user_id=:uid AND alert_type=:t
          AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR  FROM created_at)=EXTRACT(YEAR  FROM NOW())
        LIMIT 1
    """), {"uid": user_id, "t": level}).fetchone()

    print(f"🔍 existing={existing}, EMAIL_ENABLED={_EMAIL_ENABLED}, level in EMAIL_ALERT_LEVELS={level in EMAIL_ALERT_LEVELS}")

    email_sent = False

    if not existing:
        print(f"📧 Tentative envoi email pour {username}...")
        if level in EMAIL_ALERT_LEVELS and _EMAIL_ENABLED:
            _send_alert_email(
                username=username,
                user_email=email,
                pct=pct,
                total=amount,
                seuil=seuil,
                level=level,
            )
            email_sent = True
            print(f"✅ Email envoyé pour {username}")
        else:
            print(f"❌ Email NON envoyé — level={level}, EMAIL_ENABLED={_EMAIL_ENABLED}")

        db.execute(text("""
            INSERT INTO budget_alerts (user_id, alert_type, amount_tnd, seuil, pct_used, email_sent)
            VALUES (:uid, :t, :a, :s, :p, :es)
        """), {
            "uid": user_id,
            "t"  : level,
            "a"  : round(amount, 3),
            "s"  : round(seuil,  3),
            "p"  : round(pct,    2),
            "es" : email_sent,
        })
        db.commit()
    else:
        print(f"⏭ Alerte déjà existante en base pour {username} — email non renvoyé")
#C’est le cœur du fichier. Elle calcule tout 
#(pourcentage, solde restant, niveau d’alerte) et prépare les données à renvoyer au frontend.
def _build_budget(user_id: int, username: str, role: str, email: str, db: Session) -> dict:
    seuil_max, seuil_source = _get_seuil(user_id, role, db)

    # ⚠️ NOTES DE FRAIS SEULEMENT → calcul du seuil
    total_receipts = _total_expenses_this_month(user_id, db)
    # FACTURES FOURNISSEUR → informatif, hors seuil
    total_invoices = _total_invoices_this_month(user_id, db)

    total_depense = total_receipts
    # MODIFIÉ : solde_restant peut être négatif (on n'applique plus max(0, ...))
    solde_restant = seuil_max - total_depense
    pct           = (total_depense / seuil_max * 100) if seuil_max > 0 else 0.0
    level         = _alert_level(pct)

    # Passe username et email pour l'envoi d'email
    _save_alert(user_id, level, total_depense, seuil_max, pct, username, email, db)

    override = db.execute(text(
        "SELECT id, notes FROM user_budgets WHERE user_id=:uid LIMIT 1"
    ), {"uid": user_id}).fetchone()

    return {
        "user_id"          : user_id,
        "username"         : username,
        "role"             : role,
        "email"            : email,
        "seuil_max"        : round(seuil_max, 3),
        "seuil_source"     : seuil_source,
        # ⚠️ total_depense = notes de frais uniquement
        "total_depense"    : round(total_depense, 3),
        "solde_restant"    : round(solde_restant, 3),   # peut être négatif
        "pct_utilise"      : round(pct, 2),
        # MODIFIÉ : jamais bloqué
        "is_blocked"       : False,
        "depenses_receipts": round(total_receipts, 3),
        "depenses_invoices": round(total_invoices, 3),  # hors calcul
        "alert_status"     : level,
        "budget_id"        : override[0] if override else None,
        "budget_notes"     : override[1] if override else None,
    }


# ══════════════════════════════════════════════════════════════════════════════
# GET /budget/me
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/me")
def get_my_budget(
    db         : Session = Depends(get_db),
    x_username : Optional[str] = Header(default=None, alias="X-Username"),
):
    """Budget du mois courant — notes de frais uniquement."""
    ensure_budget_tables(db)
    user_id, username, role, email = _resolve_user(x_username, db)
    return _build_budget(user_id, username, role, email, db)


# ══════════════════════════════════════════════════════════════════════════════
# POST /budget/check
# ══════════════════════════════════════════════════════════════════════════════

class BudgetCheckPayload(BaseModel):
    amount_tnd    : float
    document_type : str = "expense"

@router.post("/check")
def check_budget(
    payload    : BudgetCheckPayload,
    db         : Session = Depends(get_db),
    x_username : Optional[str] = Header(default=None, alias="X-Username"),
):
    """
    Vérifie si un montant peut être ajouté.

    MODIFIÉ :
      - allowed = True TOUJOURS (plus de blocage, même si dépassé)
      - alert_level renvoyé pour affichage frontend
      - warning_95 et exceeded → message d'avertissement clair
    ⚠️ Retourne toujours allowed=True pour les factures fournisseur.
    """
    ensure_budget_tables(db)

    if payload.document_type == "supplier_invoice":
        return {
            "allowed"      : True,
            "alert_level"  : "ok",
            "message"      : "Factures fournisseur hors seuil.",
            "new_pct"      : 0,
            "solde_restant": 0,
        }

    user_id, username, role, email = _resolve_user(x_username, db)
    seuil_max, _                   = _get_seuil(user_id, role, db)
    total_actuel                   = _total_expenses_this_month(user_id, db)

    new_total     = total_actuel + payload.amount_tnd
    new_pct       = (new_total / seuil_max * 100) if seuil_max > 0 else 0
    solde_restant = seuil_max - total_actuel   # peut être négatif
    level         = _alert_level(new_pct)

    # Messages par palier (upload toujours autorisé)
    messages = {
        "ok"         : f"✓ Autorisé. Restant après upload : {seuil_max - new_total:.3f} TND.",
        "warning_80" : "⚠ 80% du plafond notes de frais atteint.",
        "warning_90" : "⚠ 90% du plafond notes de frais atteint.",
        # MODIFIÉ : message avertissement, pas blocage
        "warning_95" : (
            f"🚨 Attention : {new_pct:.1f}% du plafond atteint. "
            "L'upload est autorisé mais un email a été envoyé à l'administrateur."
        ),
        "exceeded"   : (
            f"🚨 Plafond dépassé ({new_pct:.1f}%). "
            "L'upload est maintenu. L'administrateur a été notifié par email."
        ),
    }

    return {
        # MODIFIÉ : toujours True — plus aucun blocage
        "allowed"      : True,
        "alert_level"  : level,
        "message"      : messages.get(level, ""),
        "new_pct"      : round(new_pct, 2),
        "solde_restant": round(solde_restant, 3),
        "seuil_max"    : round(seuil_max, 3),
        "total_actuel" : round(total_actuel, 3),
    }


# ══════════════════════════════════════════════════════════════════════════════
# GET /budget/users  (admin)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/users")
def get_all_budgets(
    db         : Session = Depends(get_db),
    x_username : Optional[str] = Header(default=None, alias="X-Username"),
):
    ensure_budget_tables(db)
    _, _, caller_role, _ = _resolve_user(x_username, db)
    if caller_role not in ADMIN_ROLES:
        raise HTTPException(403, "Accès refusé.")

    users   = db.execute(text(
        "SELECT id, username, email, role FROM users WHERE is_active=TRUE ORDER BY id"
    )).fetchall()
    budgets = [_build_budget(u[0], u[1], u[3], u[2], db) for u in users]
    return {"budgets": budgets, "total": len(budgets)}


# ══════════════════════════════════════════════════════════════════════════════
# GET /budget/users/{user_id}
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/users/{user_id}")
def get_user_budget(
    user_id    : int,
    db         : Session = Depends(get_db),
    x_username : Optional[str] = Header(default=None, alias="X-Username"),
):
    ensure_budget_tables(db)
    caller_id, _, caller_role, _ = _resolve_user(x_username, db)
    if caller_id != user_id and caller_role not in ADMIN_ROLES:
        raise HTTPException(403, "Accès refusé.")

    row = db.execute(text(
        "SELECT id, username, email, role FROM users WHERE id=:uid LIMIT 1"
    ), {"uid": user_id}).fetchone()
    if not row:
        raise HTTPException(404, f"Utilisateur #{user_id} introuvable.")
    return _build_budget(row[0], row[1], row[3], row[2], db)


# ══════════════════════════════════════════════════════════════════════════════
# POST/PATCH /budget/users/{user_id}  — seuil personnalisé
# ══════════════════════════════════════════════════════════════════════════════

class BudgetOverridePayload(BaseModel):
    seuil_max   : float
    period_type : str = "monthly"
    notes       : Optional[str] = None

@router.post("/users/{user_id}")
@router.patch("/users/{user_id}")
def upsert_user_budget(
    user_id    : int,
    payload    : BudgetOverridePayload,
    db         : Session = Depends(get_db),
    x_username : Optional[str] = Header(default=None, alias="X-Username"),
):
    ensure_budget_tables(db)
    caller_id, _, caller_role, _ = _resolve_user(x_username, db)
    if caller_role not in ADMIN_ROLES:
        raise HTTPException(403, "Accès refusé.")
    if payload.seuil_max <= 0:
        raise HTTPException(400, "Le seuil doit être > 0.")

    if not db.execute(text("SELECT 1 FROM users WHERE id=:uid"), {"uid": user_id}).fetchone():
        raise HTTPException(404, f"Utilisateur #{user_id} introuvable.")

    existing = db.execute(text(
        "SELECT id FROM user_budgets WHERE user_id=:uid LIMIT 1"
    ), {"uid": user_id}).fetchone()

    if existing:
        db.execute(text("""
            UPDATE user_budgets
            SET seuil_max=:s, period_type=:p, notes=:n, updated_at=NOW(), created_by=:by
            WHERE user_id=:uid
        """), {"s": payload.seuil_max, "p": payload.period_type, "n": payload.notes,
               "uid": user_id, "by": caller_id})
        action = "updated"
    else:
        db.execute(text("""
            INSERT INTO user_budgets (user_id, seuil_max, period_type, notes, created_by)
            VALUES (:uid, :s, :p, :n, :by)
        """), {"uid": user_id, "s": payload.seuil_max, "p": payload.period_type,
               "n": payload.notes, "by": caller_id})
        action = "created"

    db.commit()
    return {"status": action, "user_id": user_id, "seuil_max": payload.seuil_max}


# ══════════════════════════════════════════════════════════════════════════════
# GET /budget/alerts  (admin)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/alerts")
def get_budget_alerts(
    db         : Session = Depends(get_db),
    x_username : Optional[str] = Header(default=None, alias="X-Username"),
):
    ensure_budget_tables(db)
    _, _, caller_role, _ = _resolve_user(x_username, db)
    if caller_role not in ADMIN_ROLES:
        raise HTTPException(403, "Accès réservé aux administrateurs.")

    rows = db.execute(text("""
        SELECT ba.id, ba.user_id, u.username, ba.alert_type,
               ba.amount_tnd, ba.seuil, ba.pct_used,
               ba.email_sent, ba.acknowledged, ba.created_at
        FROM budget_alerts ba
        JOIN users u ON u.id = ba.user_id
        ORDER BY ba.acknowledged ASC, ba.created_at DESC
        LIMIT 200
    """)).fetchall()

    return [{
        "alert_id"    : r[0],
        "user_id"     : r[1],
        "username"    : r[2],
        "alert_type"  : r[3],
        "amount"      : float(r[4]) if r[4] else 0,
        "seuil"       : float(r[5]) if r[5] else 0,
        "pct_used"    : float(r[6]) if r[6] else 0,
        "email_sent"  : bool(r[7]),
        "acknowledged": bool(r[8]),
        "created_at"  : str(r[9]) if r[9] else None,
    } for r in rows]


# ══════════════════════════════════════════════════════════════════════════════
# POST /budget/alerts/{id}/ack
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/alerts/{alert_id}/ack")
def acknowledge_alert(
    alert_id   : int,
    db         : Session = Depends(get_db),
    x_username : Optional[str] = Header(default=None, alias="X-Username"),
):
    ensure_budget_tables(db)
    caller_id, _, caller_role, _ = _resolve_user(x_username, db)
    if caller_role not in ADMIN_ROLES:
        raise HTTPException(403, "Accès réservé aux administrateurs.")

    if not db.execute(text("SELECT 1 FROM budget_alerts WHERE id=:aid"), {"aid": alert_id}).fetchone():
        raise HTTPException(404, f"Alerte #{alert_id} introuvable.")

    db.execute(text(
        "UPDATE budget_alerts SET acknowledged=TRUE, ack_by=:by WHERE id=:aid"
    ), {"by": caller_id, "aid": alert_id})
    db.commit()
    return {"status": "acknowledged", "alert_id": alert_id}