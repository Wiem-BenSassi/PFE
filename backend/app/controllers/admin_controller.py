# app/controllers/admin_controller.py
# ─────────────────────────────────────────────────────────────
# Module administrateur : gestion des seuils + analytics
# Accessible uniquement aux rôles Admin et Admin Système
# ─────────────────────────────────────────────────────────────

from fastapi          import APIRouter, Depends, HTTPException
from sqlalchemy.orm   import Session
from sqlalchemy       import text
from pydantic         import BaseModel
from typing           import Optional
from datetime         import date

from app.database.connection import get_db
from auth.rbac               import get_current_user, ROLES

router = APIRouter()

# ── Rôles autorisés pour ce module ───────────────────────────
ADMIN_ROLES = [ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER]


def require_admin(current_user=Depends(get_current_user)):
    """Dépendance : bloque tout rôle non-admin."""
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Accès refusé — réservé aux administrateurs."
        )
    return current_user


# ══════════════════════════════════════════════════════════════
# MODÈLES PYDANTIC
# ══════════════════════════════════════════════════════════════

class ThresholdUpdate(BaseModel):
    max_amount_tnd:         Optional[float] = None
    auto_approve_below_tnd: Optional[float] = None
    is_active:              Optional[bool]  = None


# ══════════════════════════════════════════════════════════════
# GET /admin/thresholds
# Liste tous les seuils par rôle
# ══════════════════════════════════════════════════════════════

@router.get("/thresholds")
def get_thresholds(
    db           : Session = Depends(get_db),
    current_user           = Depends(require_admin),
):
    """
    Retourne la liste de tous les seuils de remboursement.
    Inclut le statut is_active pour afficher les badges.
    """
    rows = db.execute(text("""
        SELECT
            id,
            role_name,
            max_amount_tnd,
            auto_approve_below_tnd,
            is_active,
            updated_at
        FROM expense_thresholds
        ORDER BY role_name
    """)).fetchall()

    return [
        {
            "id"                    : r[0],
            "role_name"             : r[1],
            "max_amount_tnd"        : float(r[2]),
            "auto_approve_below_tnd": float(r[3]) if r[3] else 0.0,
            "is_active"             : bool(r[4]),
            "updated_at"            : str(r[5]) if r[5] else None,
        }
        for r in rows
    ]


# ══════════════════════════════════════════════════════════════
# PUT /admin/thresholds/{id}
# Modifier max_amount_tnd et/ou auto_approve_below_tnd
# ══════════════════════════════════════════════════════════════

@router.put("/thresholds/{threshold_id}")
def update_threshold(
    threshold_id : int,
    payload      : ThresholdUpdate,
    db           : Session = Depends(get_db),
    current_user           = Depends(require_admin),
):
    """
    Met à jour les montants d'un seuil.
    Seuls les champs envoyés sont modifiés.
    """
    # Vérifier que le seuil existe
    row = db.execute(
        text("SELECT id FROM expense_thresholds WHERE id = :id"),
        {"id": threshold_id}
    ).fetchone()

    if not row:
        raise HTTPException(404, f"Seuil {threshold_id} introuvable.")

    # Construire la requête dynamiquement
    updates = {}
    if payload.max_amount_tnd         is not None:
        updates["max_amount_tnd"]          = payload.max_amount_tnd
    if payload.auto_approve_below_tnd is not None:
        updates["auto_approve_below_tnd"]  = payload.auto_approve_below_tnd
    if payload.is_active              is not None:
        updates["is_active"]               = payload.is_active

    if not updates:
        raise HTTPException(400, "Aucune donnée à mettre à jour.")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = threshold_id

    db.execute(
        text(f"""
            UPDATE expense_thresholds
            SET {set_clause}, updated_at = NOW()
            WHERE id = :id
        """),
        updates
    )
    db.commit()

    return {"status": "updated", "threshold_id": threshold_id}


# ══════════════════════════════════════════════════════════════
# PATCH /admin/thresholds/{id}/toggle-status
# Activer / Désactiver un seuil
# ══════════════════════════════════════════════════════════════

@router.patch("/thresholds/{threshold_id}/toggle-status")
def toggle_threshold_status(
    threshold_id : int,
    db           : Session = Depends(get_db),
    current_user           = Depends(require_admin),
):
    """
    Bascule is_active entre TRUE et FALSE.
    Un seuil inactif est ignoré lors des vérifications de remboursement.
    """
    row = db.execute(
        text("SELECT id, is_active FROM expense_thresholds WHERE id = :id"),
        {"id": threshold_id}
    ).fetchone()

    if not row:
        raise HTTPException(404, f"Seuil {threshold_id} introuvable.")

    new_status = not bool(row[1])

    db.execute(
        text("""
            UPDATE expense_thresholds
            SET is_active = :status, updated_at = NOW()
            WHERE id = :id
        """),
        {"status": new_status, "id": threshold_id}
    )
    db.commit()

    return {
        "status"      : "toggled",
        "threshold_id": threshold_id,
        "is_active"   : new_status
    }


# ══════════════════════════════════════════════════════════════
# GET /admin/analytics/user-consumption
# Consommation des dépenses par utilisateur
# ══════════════════════════════════════════════════════════════

@router.get("/analytics/user-consumption")
def get_user_consumption(
    date_from    : Optional[str] = None,   # format YYYY-MM-DD
    date_to      : Optional[str] = None,
    db           : Session       = Depends(get_db),
    current_user                 = Depends(require_admin),
):
    """
    Retourne la consommation par utilisateur :
    - total_amount_tnd : total dépensé
    - receipt_count    : nombre de reçus soumis
    - status breakdown : approved / pending / rejected

    Filtrable par période (date_from / date_to).
    """
    # Construire le filtre de date
    date_filter = ""
    params: dict = {}

    if date_from:
        date_filter += " AND er.created_at >= :date_from"
        params["date_from"] = date_from
    if date_to:
        date_filter += " AND er.created_at <= :date_to"
        params["date_to"] = date_to

    rows = db.execute(text(f"""
        SELECT
            u.id                            AS user_id,
            u.username,
            u.role,
            u.email,
            COUNT(er.id)                    AS receipt_count,
            COALESCE(SUM(er.total_amount_tnd), 0) AS total_tnd,
            COUNT(CASE WHEN er.status = 'auto_approved' OR er.status = 'validated' THEN 1 END) AS approved_count,
            COUNT(CASE WHEN er.status = 'pending'       THEN 1 END) AS pending_count,
            COUNT(CASE WHEN er.status = 'auto_rejected' OR er.status = 'rejected'  THEN 1 END) AS rejected_count
        FROM users u
        LEFT JOIN expense_receipts er
            ON er.submitted_by = u.id {date_filter}
        GROUP BY u.id, u.username, u.role, u.email
        ORDER BY total_tnd DESC
    """), params).fetchall()

    return [
        {
            "user_id"       : r[0],
            "username"      : r[1],
            "role"          : r[2],
            "email"         : r[3],
            "receipt_count" : int(r[4]),
            "total_tnd"     : float(r[5]),
            "approved_count": int(r[6]),
            "pending_count" : int(r[7]),
            "rejected_count": int(r[8]),
        }
        for r in rows
    ]


# ══════════════════════════════════════════════════════════════
# GET /admin/analytics/summary
# Résumé global pour les cartes KPI
# ══════════════════════════════════════════════════════════════

@router.get("/analytics/summary")
def get_summary(
    db           : Session = Depends(get_db),
    current_user           = Depends(require_admin),
):
    """KPIs globaux affichés en haut de l'admin dashboard."""
    row = db.execute(text("""
        SELECT
            COUNT(*)                                                   AS total_receipts,
            COALESCE(SUM(total_amount_tnd), 0)                        AS total_tnd,
            COUNT(CASE WHEN status IN ('auto_approved','validated') THEN 1 END) AS approved,
            COUNT(CASE WHEN status = 'pending'                      THEN 1 END) AS pending,
            COUNT(CASE WHEN status IN ('auto_rejected','rejected')   THEN 1 END) AS rejected
        FROM expense_receipts
    """)).fetchone()

    users_row = db.execute(
        text("SELECT COUNT(*) FROM users")
    ).fetchone()

    return {
        "total_receipts": int(row[0]),
        "total_tnd"     : float(row[1]),
        "approved"      : int(row[2]),
        "pending"       : int(row[3]),
        "rejected"      : int(row[4]),
        "total_users"   : int(users_row[0]),
    }