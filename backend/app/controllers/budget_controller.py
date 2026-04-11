# ─── app/controllers/budget_controller.py ────────────────────────────────────
#
# MODULE : Gestion des seuils financiers par utilisateur
#
# ENDPOINTS :
#   GET    /budget/me                     → mon budget (utilisateur connecté)
#   GET    /budget/users                  → tous les budgets (admin)
#   GET    /budget/users/{user_id}        → budget d'un utilisateur précis (admin)
#   POST   /budget/users/{user_id}        → créer/remplacer le seuil (admin)
#   PATCH  /budget/users/{user_id}        → modifier le seuil (admin)
#   DELETE /budget/users/{user_id}        → supprimer le seuil personnalisé (admin)
#   GET    /budget/alerts                 → historique des alertes (admin)
#   POST   /budget/alerts/{id}/ack        → acquitter une alerte (admin)
#   POST   /budget/check                  → vérifier un montant avant upload
#
# INTÉGRATION :
#   Ajouter dans main.py :
#     from app.controllers.budget_controller import router as budget_router
#     app.include_router(budget_router, prefix="/budget", tags=["Budget"])

from fastapi        import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy     import text
from pydantic       import BaseModel
from typing         import Optional
from datetime       import datetime

from app.database.connection import get_db
from auth.rbac               import get_current_user, ROLES

router = APIRouter()

# ── Rôles autorisés pour la gestion des budgets ───────────────────────────────
ADMIN_ROLES = [ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER]


# ══════════════════════════════════════════════════════════════════════════════
# MODÈLES PYDANTIC
# ══════════════════════════════════════════════════════════════════════════════

class BudgetCreate(BaseModel):
    """Payload pour créer ou remplacer le seuil d'un utilisateur."""
    seuil_max    : float            # Plafond maximum en TND (ex: 100000)
    period_type  : str = "monthly"  # 'monthly' | 'annual'
    notes        : Optional[str] = None


class BudgetUpdate(BaseModel):
    """Payload pour modifier partiellement le seuil (tous champs optionnels)."""
    seuil_max    : Optional[float] = None
    period_type  : Optional[str]  = None
    notes        : Optional[str]  = None


class BudgetCheckPayload(BaseModel):
    """Vérifie si un montant peut être soumis sans dépasser le seuil."""
    amount_tnd  : float
    document_type: str = "expense"  # 'expense' | 'supplier_invoice'


# ══════════════════════════════════════════════════════════════════════════════
# HELPER : lire le budget d'un utilisateur depuis la vue v_user_budget_status
# ══════════════════════════════════════════════════════════════════════════════

def _get_budget_row(user_id: int, db: Session) -> dict:
    """
    Lit les données de budget depuis la vue v_user_budget_status.
    Inclut : seuil_max, total_depense, solde_restant, pct_utilise.
    """
    row = db.execute(text("""
        SELECT
            user_id, username, email, role,
            seuil_max,
            depenses_receipts,
            depenses_invoices,
            total_depense,
            solde_restant,
            pct_utilise,
            seuil_source,
            budget_id,
            budget_notes
        FROM v_user_budget_status
        WHERE user_id = :uid
    """), {"uid": user_id}).fetchone()

    if not row:
        raise HTTPException(404, f"Utilisateur #{user_id} introuvable.")

    seuil_max     = float(row[4])
    total_depense = float(row[7])
    solde_restant = float(row[8])
    pct_utilise   = float(row[9])

    # Calcul du statut d'alerte
    if pct_utilise >= 100:
        alert_status = "exceeded"
        alert_color  = "#f87171"   # rouge
    elif pct_utilise >= 90:
        alert_status = "warning_90"
        alert_color  = "#f59e0b"   # orange foncé
    elif pct_utilise >= 80:
        alert_status = "warning_80"
        alert_color  = "#f59e0b"   # orange
    else:
        alert_status = "ok"
        alert_color  = "#10b981"   # vert

    return {
        "user_id"           : row[0],
        "username"          : row[1],
        "email"             : row[2],
        "role"              : row[3],
        "seuil_max"         : seuil_max,
        "depenses_receipts" : float(row[5]),
        "depenses_invoices" : float(row[6]),
        "total_depense"     : round(total_depense, 3),
        "solde_restant"     : round(solde_restant, 3),
        "pct_utilise"       : round(pct_utilise, 2),
        "seuil_source"      : row[10],   # 'user' ou 'role'
        "budget_id"         : row[11],
        "budget_notes"      : row[12],
        "alert_status"      : alert_status,
        "alert_color"       : alert_color,
        "is_blocked"        : pct_utilise >= 100,   # upload bloqué si dépassé
    }


# ── Helper : générer une alerte si seuil franchi ─────────────────────────────
def _maybe_create_alert(user_id: int, pct: float, total: float, seuil: float,
                        document_id: Optional[int], db: Session):
    """
    Crée une alerte dans budget_alerts si le pourcentage atteint un seuil critique.
    Ne duplique pas les alertes du même type pour le même mois.
    """
    if pct < 80:
        return

    alert_type = (
        "exceeded"    if pct >= 100 else
        "warning_90"  if pct >= 90  else
        "warning_80"
    )

    # Vérifie si cette alerte n'existe pas déjà ce mois-ci
    existing = db.execute(text("""
        SELECT id FROM budget_alerts
        WHERE user_id    = :uid
          AND alert_type = :atype
          AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR  FROM created_at) = EXTRACT(YEAR  FROM NOW())
        LIMIT 1
    """), {"uid": user_id, "atype": alert_type}).fetchone()

    if existing:
        return   # alerte déjà créée ce mois pour ce seuil

    db.execute(text("""
        INSERT INTO budget_alerts
            (user_id, alert_type, amount_at_alert, seuil_at_alert, pct_used, document_id)
        VALUES
            (:uid, :atype, :amount, :seuil, :pct, :did)
    """), {
        "uid"   : user_id,
        "atype" : alert_type,
        "amount": round(total, 3),
        "seuil" : round(seuil, 3),
        "pct"   : round(pct, 2),
        "did"   : document_id,
    })
    db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# GET /budget/me
# Budget de l'utilisateur connecté
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/me")
def get_my_budget(
    db           : Session = Depends(get_db),
    current_user           = Depends(get_current_user),
):
    """
    Retourne le budget de l'utilisateur connecté :
      - seuil_max     : plafond autorisé
      - total_depense : somme des dépenses du mois (notes de frais + factures)
      - solde_restant : seuil_max - total_depense
      - pct_utilise   : pourcentage d'utilisation
      - alert_status  : 'ok' | 'warning_80' | 'warning_90' | 'exceeded'
      - is_blocked    : True si upload bloqué (pct >= 100)
    """
    return _get_budget_row(current_user.id, db)


# ══════════════════════════════════════════════════════════════════════════════
# GET /budget/users
# Liste de tous les budgets (admin seulement)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/users")
def get_all_budgets(
    db           : Session = Depends(get_db),
    current_user           = Depends(get_current_user),
):
    """
    Retourne le budget de tous les utilisateurs.
    RÉSERVÉ aux administrateurs.
    """
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(403, "Accès refusé — réservé aux administrateurs.")

    rows = db.execute(text("""
        SELECT
            user_id, username, email, role,
            seuil_max, total_depense, solde_restant, pct_utilise,
            seuil_source, budget_id, budget_notes,
            depenses_receipts, depenses_invoices
        FROM v_user_budget_status
        ORDER BY pct_utilise DESC, username ASC
    """)).fetchall()

    result = []
    for row in rows:
        pct = float(row[7])
        result.append({
            "user_id"           : row[0],
            "username"          : row[1],
            "email"             : row[2],
            "role"              : row[3],
            "seuil_max"         : float(row[4]),
            "total_depense"     : round(float(row[5]), 3),
            "solde_restant"     : round(float(row[6]), 3),
            "pct_utilise"       : round(pct, 2),
            "seuil_source"      : row[8],
            "budget_id"         : row[9],
            "budget_notes"      : row[10],
            "depenses_receipts" : round(float(row[11]), 3),
            "depenses_invoices" : round(float(row[12]), 3),
            "alert_status"      : (
                "exceeded"   if pct >= 100 else
                "warning_90" if pct >= 90  else
                "warning_80" if pct >= 80  else
                "ok"
            ),
            "is_blocked"        : pct >= 100,
        })

    return {"total": len(result), "budgets": result}


# ══════════════════════════════════════════════════════════════════════════════
# GET /budget/users/{user_id}
# Budget d'un utilisateur précis (admin)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/users/{user_id}")
def get_user_budget(
    user_id      : int,
    db           : Session = Depends(get_db),
    current_user           = Depends(get_current_user),
):
    """Budget détaillé d'un utilisateur. Admin ou l'utilisateur lui-même."""
    if current_user.role not in ADMIN_ROLES and current_user.id != user_id:
        raise HTTPException(403, "Accès refusé.")
    return _get_budget_row(user_id, db)


# ══════════════════════════════════════════════════════════════════════════════
# POST /budget/users/{user_id}
# Créer ou remplacer le seuil d'un utilisateur
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/users/{user_id}", status_code=201)
def set_user_budget(
    user_id      : int,
    payload      : BudgetCreate,
    db           : Session = Depends(get_db),
    current_user           = Depends(get_current_user),
):
    """
    Crée ou remplace le seuil personnalisé d'un utilisateur.
    RÉSERVÉ aux administrateurs.
    """
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(403, "Accès refusé — réservé aux administrateurs.")

    if payload.seuil_max <= 0:
        raise HTTPException(400, "Le seuil doit être supérieur à 0.")

    # Vérifie que l'utilisateur existe
    user = db.execute(
        text("SELECT id, username FROM users WHERE id = :uid"),
        {"uid": user_id}
    ).fetchone()
    if not user:
        raise HTTPException(404, f"Utilisateur #{user_id} introuvable.")

    # Supprime l'ancien seuil s'il existe (remplace)
    db.execute(
        text("DELETE FROM user_budgets WHERE user_id = :uid"),
        {"uid": user_id}
    )

    # Insère le nouveau seuil
    db.execute(text("""
        INSERT INTO user_budgets (user_id, seuil_max, period_type, notes, set_by, updated_at)
        VALUES (:uid, :seuil, :period, :notes, :set_by, NOW())
    """), {
        "uid"    : user_id,
        "seuil"  : payload.seuil_max,
        "period" : payload.period_type,
        "notes"  : payload.notes,
        "set_by" : current_user.id,
    })
    db.commit()

    return {
        "status"   : "created",
        "user_id"  : user_id,
        "username" : user[1],
        "seuil_max": payload.seuil_max,
        "message"  : f"Seuil de {payload.seuil_max:.3f} TND défini pour {user[1]}.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# PATCH /budget/users/{user_id}
# Modifier partiellement le seuil
# ══════════════════════════════════════════════════════════════════════════════

@router.patch("/users/{user_id}")
def update_user_budget(
    user_id      : int,
    payload      : BudgetUpdate,
    db           : Session = Depends(get_db),
    current_user           = Depends(get_current_user),
):
    """Modifie partiellement le seuil d'un utilisateur. Admin seulement."""
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(403, "Accès refusé.")

    existing = db.execute(
        text("SELECT id FROM user_budgets WHERE user_id = :uid"),
        {"uid": user_id}
    ).fetchone()

    if not existing:
        raise HTTPException(404, f"Aucun seuil personnalisé pour l'utilisateur #{user_id}. "
                                  "Utilisez POST pour en créer un.")

    updates = {}
    if payload.seuil_max   is not None: updates["seuil_max"]   = payload.seuil_max
    if payload.period_type is not None: updates["period_type"] = payload.period_type
    if payload.notes       is not None: updates["notes"]       = payload.notes

    if not updates:
        raise HTTPException(400, "Aucun champ à modifier.")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    db.execute(
        text(f"UPDATE user_budgets SET {set_clause}, updated_at = NOW() WHERE user_id = :uid"),
        {**updates, "uid": user_id}
    )
    db.commit()

    return {
        "status"  : "updated",
        "user_id" : user_id,
        "message" : "Seuil mis à jour avec succès.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# DELETE /budget/users/{user_id}
# Supprimer le seuil personnalisé (revient au seuil de rôle)
# ══════════════════════════════════════════════════════════════════════════════

@router.delete("/budget/users/{user_id}")
def delete_user_budget(
    user_id      : int,
    db           : Session = Depends(get_db),
    current_user           = Depends(get_current_user),
):
    """Supprime le seuil personnalisé — l'utilisateur revient au seuil de son rôle."""
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(403, "Accès refusé.")

    db.execute(text("DELETE FROM user_budgets WHERE user_id = :uid"), {"uid": user_id})
    db.commit()

    return {
        "status"  : "deleted",
        "user_id" : user_id,
        "message" : "Seuil personnalisé supprimé. Le seuil du rôle s'applique maintenant.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# GET /budget/alerts
# Historique des alertes (admin)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/alerts")
def get_budget_alerts(
    unread_only  : bool = Query(default=False),
    db           : Session = Depends(get_db),
    current_user           = Depends(get_current_user),
):
    """
    Retourne l'historique des alertes de dépassement.
    Si unread_only=True → uniquement les alertes non acquittées.
    Admin seulement.
    """
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(403, "Accès refusé.")

    where = "WHERE ba.acknowledged = FALSE" if unread_only else ""

    rows = db.execute(text(f"""
        SELECT
            ba.id, ba.user_id, u.username, ba.alert_type,
            ba.amount_at_alert, ba.seuil_at_alert, ba.pct_used,
            ba.acknowledged, ba.created_at
        FROM   budget_alerts ba
        JOIN   users u ON u.id = ba.user_id
        {where}
        ORDER BY ba.created_at DESC
        LIMIT 100
    """)).fetchall()

    return [
        {
            "alert_id"      : r[0],
            "user_id"       : r[1],
            "username"      : r[2],
            "alert_type"    : r[3],
            "amount"        : float(r[4]) if r[4] else 0,
            "seuil"         : float(r[5]) if r[5] else 0,
            "pct_used"      : float(r[6]) if r[6] else 0,
            "acknowledged"  : bool(r[7]),
            "created_at"    : str(r[8]),
        }
        for r in rows
    ]


# ══════════════════════════════════════════════════════════════════════════════
# POST /budget/alerts/{alert_id}/ack
# Acquitter une alerte
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/alerts/{alert_id}/ack")
def acknowledge_alert(
    alert_id     : int,
    db           : Session = Depends(get_db),
    current_user           = Depends(get_current_user),
):
    """Marque une alerte comme lue/traitée."""
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(403, "Accès refusé.")

    db.execute(text("""
        UPDATE budget_alerts
        SET    acknowledged    = TRUE,
               acknowledged_by = :uid,
               acknowledged_at = NOW()
        WHERE  id = :aid
    """), {"uid": current_user.id, "aid": alert_id})
    db.commit()

    return {"status": "acknowledged", "alert_id": alert_id}


# ══════════════════════════════════════════════════════════════════════════════
# POST /budget/check
# Vérifier un montant AVANT l'upload (appelé depuis UploadPage / InvoiceVerification)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/check")
def check_budget(
    payload      : BudgetCheckPayload,
    db           : Session = Depends(get_db),
    current_user           = Depends(get_current_user),
):
    """
    Vérifie si le montant soumis peut être accepté sans dépasser le seuil.
    Appelé côté frontend avant de confirmer un upload.

    Retourne :
      - allowed     : True si le montant peut être soumis
      - new_pct     : nouveau pourcentage si ce montant est accepté
      - alert_level : 'ok' | 'warning' | 'blocked'
      - message     : message explicatif
    """
    budget = _get_budget_row(current_user.id, db)

    seuil_max     = budget["seuil_max"]
    total_actuel  = budget["total_depense"]
    new_total     = total_actuel + payload.amount_tnd
    new_pct       = (new_total / seuil_max * 100) if seuil_max > 0 else 0

    if new_total > seuil_max:
        allowed     = False
        alert_level = "blocked"
        message     = (
            f"Upload refusé : ce montant ({payload.amount_tnd:.3f} TND) "
            f"dépasserait votre plafond de {seuil_max:.3f} TND. "
            f"Solde restant : {budget['solde_restant']:.3f} TND."
        )
    elif new_pct >= 90:
        allowed     = True
        alert_level = "warning"
        message     = (
            f"⚠ Attention : après cet upload, vous aurez utilisé "
            f"{new_pct:.1f}% de votre plafond ({seuil_max:.3f} TND)."
        )
    elif new_pct >= 80:
        allowed     = True
        alert_level = "warning"
        message     = (
            f"⚠ Vous approchez de votre plafond ({new_pct:.1f}% utilisé)."
        )
    else:
        allowed     = True
        alert_level = "ok"
        message     = f"Montant accepté. Solde restant : {budget['solde_restant'] - payload.amount_tnd:.3f} TND."

    # Générer une alerte en DB si seuil franchi
    if new_pct >= 80:
        _maybe_create_alert(
            user_id     = current_user.id,
            pct         = new_pct,
            total       = new_total,
            seuil       = seuil_max,
            document_id = None,
            db          = db,
        )

    return {
        "allowed"        : allowed,
        "alert_level"    : alert_level,
        "message"        : message,
        "seuil_max"      : seuil_max,
        "total_actuel"   : round(total_actuel, 3),
        "montant_soumis" : payload.amount_tnd,
        "new_total"      : round(new_total, 3),
        "new_pct"        : round(new_pct, 2),
        "solde_restant"  : round(max(0, seuil_max - new_total), 3),
    }