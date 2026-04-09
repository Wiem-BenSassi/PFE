# app/controllers/system_admin_controller.py
# ═══════════════════════════════════════════════════════════════════════════════
# MODULE : ADMINISTRATEUR SYSTÈME
# Gestion complète des utilisateurs, rôles et seuils.
# ACCÈS RÉSERVÉ EXCLUSIVEMENT au rôle "Administrateur Système".
# ═══════════════════════════════════════════════════════════════════════════════

from fastapi        import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy     import text
from pydantic       import BaseModel, EmailStr
from typing         import Optional, List
from datetime       import datetime

from app.database.connection import get_db
from auth.rbac               import get_current_user, ROLES

router = APIRouter()

# ── Rôles disponibles dans le système ────────────────────────────────────────
AVAILABLE_ROLES = [
    "Administrateur Système",
    "Administrateur",
    "Comptable",
    "Utilisateur",
]


# ── Dépendance : vérifie que l'utilisateur est bien Administrateur Système ────
def require_system_admin(current_user=Depends(get_current_user)):
    """Bloque tout rôle qui n'est pas Administrateur Système."""
    if current_user.role != ROLES.ADMIN_SYSTEME:
        raise HTTPException(
            status_code=403,
            detail="Accès refusé — réservé à l'Administrateur Système uniquement."
        )
    return current_user


# ══════════════════════════════════════════════════════════════════════════════
# MODÈLES PYDANTIC
# ══════════════════════════════════════════════════════════════════════════════

class UserCreate(BaseModel):
    """Données pour créer un nouvel utilisateur."""
    username : str
    email    : str
    password : str
    role     : str

class UserUpdate(BaseModel):
    """Données pour modifier un utilisateur (tous les champs sont optionnels)."""
    username : Optional[str] = None
    email    : Optional[str] = None
    password : Optional[str] = None
    role     : Optional[str] = None

class RoleUpdate(BaseModel):
    """Payload pour changer uniquement le rôle d'un utilisateur."""
    role : str

class ThresholdCreate(BaseModel):
    """Données pour créer un nouveau seuil de remboursement."""
    role_name              : str            # rôle ciblé (ex: "Comptable")
    max_amount_tnd         : float          # plafond maximum
    auto_approve_below_tnd : Optional[float] = 0.0  # seuil d'auto-approbation
    is_active              : bool = True


# ══════════════════════════════════════════════════════════════════════════════
# UTILISATEURS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/users")
def get_all_users(
    db           : Session = Depends(get_db),
    current_user           = Depends(require_system_admin),
):
    """
    GET /sysadmin/users
    Retourne la liste complète des utilisateurs.
    """
    rows = db.execute(text("""
        SELECT id, username, email, role
        FROM users
        ORDER BY id ASC
    """)).fetchall()

    return [
        {
            "id"       : r[0],
            "username" : r[1],
            "email"    : r[2],
            "role"     : r[3],
        }
        for r in rows
    ]


@router.post("/users", status_code=201)
def create_user(
    payload      : UserCreate,
    db           : Session = Depends(get_db),
    current_user           = Depends(require_system_admin),
):
    """
    POST /sysadmin/users
    Crée un nouvel utilisateur.
    Vérifie que l'email n'est pas déjà pris.
    """
    # Vérification email unique
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": payload.email}
    ).fetchone()

    if existing:
        raise HTTPException(400, f"L'email '{payload.email}' est déjà utilisé.")

    # Vérification que le rôle est valide
    if payload.role not in AVAILABLE_ROLES:
        raise HTTPException(400, f"Rôle invalide : '{payload.role}'. Rôles disponibles : {AVAILABLE_ROLES}")

    # Insertion en base
    db.execute(text("""
        INSERT INTO users (username, email, password, role)
        VALUES (:username, :email, :password, :role)
    """), {
        "username" : payload.username,
        "email"    : payload.email,
        "password" : payload.password,   # En production : hashé avec bcrypt
        "role"     : payload.role,
    })
    db.commit()

    # Retourner le nouvel utilisateur
    new_user = db.execute(
        text("SELECT id, username, email, role FROM users WHERE email = :email"),
        {"email": payload.email}
    ).fetchone()

    return {
        "status"  : "created",
        "message" : f"Utilisateur '{payload.username}' créé avec succès.",
        "user"    : {"id": new_user[0], "username": new_user[1], "email": new_user[2], "role": new_user[3]},
    }


@router.put("/users/{user_id}")
def update_user(
    user_id      : int,
    payload      : UserUpdate,
    db           : Session = Depends(get_db),
    current_user           = Depends(require_system_admin),
):
    """
    PUT /sysadmin/users/{id}
    Modifie un utilisateur existant.
    Seuls les champs envoyés sont mis à jour.
    """
    # Vérifier que l'utilisateur existe
    existing = db.execute(
        text("SELECT id, username FROM users WHERE id = :id"),
        {"id": user_id}
    ).fetchone()

    if not existing:
        raise HTTPException(404, f"Utilisateur #{user_id} introuvable.")

    # Construire la requête dynamiquement (seulement les champs fournis)
    updates = {}
    if payload.username is not None: updates["username"] = payload.username
    if payload.email    is not None: updates["email"]    = payload.email
    if payload.password is not None: updates["password"] = payload.password
    if payload.role     is not None:
        if payload.role not in AVAILABLE_ROLES:
            raise HTTPException(400, f"Rôle invalide : '{payload.role}'.")
        updates["role"] = payload.role

    if not updates:
        raise HTTPException(400, "Aucune donnée à mettre à jour.")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = user_id

    db.execute(text(f"UPDATE users SET {set_clause} WHERE id = :id"), updates)
    db.commit()

    return {"status": "updated", "user_id": user_id, "message": "Utilisateur mis à jour."}


@router.delete("/users/{user_id}")
def delete_user(
    user_id      : int,
    db           : Session = Depends(get_db),
    current_user           = Depends(require_system_admin),
):
    """
    DELETE /sysadmin/users/{id}
    Supprime définitivement un utilisateur.
    Protection : un admin système ne peut pas se supprimer lui-même.
    """
    # Protection : pas de suicide
    if user_id == current_user.id:
        raise HTTPException(400, "Vous ne pouvez pas supprimer votre propre compte.")

    # Vérifier que l'utilisateur existe
    existing = db.execute(
        text("SELECT id, username FROM users WHERE id = :id"),
        {"id": user_id}
    ).fetchone()

    if not existing:
        raise HTTPException(404, f"Utilisateur #{user_id} introuvable.")

    db.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
    db.commit()

    return {
        "status"  : "deleted",
        "user_id" : user_id,
        "message" : f"Utilisateur '{existing[1]}' supprimé avec succès."
    }


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id      : int,
    payload      : RoleUpdate,
    db           : Session = Depends(get_db),
    current_user           = Depends(require_system_admin),
):
    """
    PUT /sysadmin/users/{id}/role
    Change uniquement le rôle d'un utilisateur.
    """
    if payload.role not in AVAILABLE_ROLES:
        raise HTTPException(400, f"Rôle invalide : '{payload.role}'.")

    existing = db.execute(
        text("SELECT id, username FROM users WHERE id = :id"),
        {"id": user_id}
    ).fetchone()

    if not existing:
        raise HTTPException(404, f"Utilisateur #{user_id} introuvable.")

    db.execute(
        text("UPDATE users SET role = :role WHERE id = :id"),
        {"role": payload.role, "id": user_id}
    )
    db.commit()

    return {
        "status"  : "role_updated",
        "user_id" : user_id,
        "new_role": payload.role,
        "message" : f"Rôle de '{existing[1]}' changé en '{payload.role}'."
    }


# ══════════════════════════════════════════════════════════════════════════════
# RÔLES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/roles")
def get_roles(current_user=Depends(require_system_admin)):
    """
    GET /sysadmin/roles
    Retourne la liste des rôles disponibles dans le système.
    """
    return {
        "roles"      : AVAILABLE_ROLES,
        "total"      : len(AVAILABLE_ROLES),
        "description": {
            "Administrateur Système"  : "Accès total — gestion utilisateurs, rôles, seuils",
            "Administrateur"          : "Gestion des seuils et analytics",
            "Comptable"               : "Upload factures fournisseurs, accès dashboard",
            "Responsable Financière"  : "Validation des dépenses",
            "Directeur Générale"      : "Vue globale des opérations",
            "Responsable IT"          : "Accès technique",
            "stagiaire 1"             : "Accès limité — notes de frais uniquement",
            "stagiaire 2"             : "Accès limité — notes de frais uniquement",
            "Utilisateur"             : "Notes de frais uniquement",
        }
    }


# ══════════════════════════════════════════════════════════════════════════════
# SEUILS — Création réservée à l'Administrateur Système
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/thresholds")
def get_all_thresholds(
    db           : Session = Depends(get_db),
    current_user           = Depends(require_system_admin),
):
    """
    GET /sysadmin/thresholds
    Retourne tous les seuils de remboursement.
    """
    rows = db.execute(text("""
        SELECT id, role_name, max_amount_tnd, auto_approve_below_tnd, is_active, updated_at
        FROM expense_thresholds
        ORDER BY role_name ASC
    """)).fetchall()

    return [
        {
            "id"                    : r[0],
            "role_name"             : r[1],
            "max_amount_tnd"        : float(r[2]),
            "auto_approve_below_tnd": float(r[3] or 0),
            "is_active"             : bool(r[4]),
            "updated_at"            : str(r[5]) if r[5] else None,
        }
        for r in rows
    ]


@router.post("/thresholds", status_code=201)
def create_threshold(
    payload      : ThresholdCreate,
    db           : Session = Depends(get_db),
    current_user           = Depends(require_system_admin),
):
    """
    POST /sysadmin/thresholds
    Crée un nouveau seuil.
    RÉSERVÉ à l'Administrateur Système — l'Administrateur métier ne peut PAS créer.
    Vérifie qu'un seuil pour ce rôle n'existe pas déjà.
    """
    # Vérifier que le rôle est valide
    if payload.role_name not in AVAILABLE_ROLES:
        raise HTTPException(400, f"Rôle invalide : '{payload.role_name}'.")

    # Vérifier la cohérence des montants
    if payload.auto_approve_below_tnd and payload.auto_approve_below_tnd > payload.max_amount_tnd:
        raise HTTPException(
            400,
            "Le seuil d'auto-approbation ne peut pas dépasser le plafond maximum."
        )

    # Vérifier qu'un seuil n'existe pas déjà pour ce rôle
    existing = db.execute(
        text("SELECT id FROM expense_thresholds WHERE role_name = :role"),
        {"role": payload.role_name}
    ).fetchone()

    if existing:
        raise HTTPException(
            400,
            f"Un seuil existe déjà pour le rôle '{payload.role_name}'. "
            f"Utilisez PUT /admin/thresholds/{existing[0]} pour le modifier."
        )

    # Insertion
    db.execute(text("""
        INSERT INTO expense_thresholds
            (role_name, max_amount_tnd, auto_approve_below_tnd, is_active, updated_at)
        VALUES
            (:role_name, :max_amount, :auto_approve, :is_active, NOW())
    """), {
        "role_name"   : payload.role_name,
        "max_amount"  : payload.max_amount_tnd,
        "auto_approve": payload.auto_approve_below_tnd or 0.0,
        "is_active"   : payload.is_active,
    })
    db.commit()

    # Récupérer le seuil créé
    new = db.execute(
        text("SELECT id FROM expense_thresholds WHERE role_name = :role ORDER BY id DESC LIMIT 1"),
        {"role": payload.role_name}
    ).fetchone()

    return {
        "status"      : "created",
        "threshold_id": new[0],
        "role_name"   : payload.role_name,
        "max_amount"  : payload.max_amount_tnd,
        "message"     : f"Seuil créé pour le rôle '{payload.role_name}' ({payload.max_amount_tnd} TND max)."
    }


@router.delete("/thresholds/{threshold_id}")
def delete_threshold(
    threshold_id : int,
    db           : Session = Depends(get_db),
    current_user           = Depends(require_system_admin),
):
    """
    DELETE /sysadmin/thresholds/{id}
    Supprime un seuil. RÉSERVÉ à l'Administrateur Système.
    """
    existing = db.execute(
        text("SELECT id, role_name FROM expense_thresholds WHERE id = :id"),
        {"id": threshold_id}
    ).fetchone()

    if not existing:
        raise HTTPException(404, f"Seuil #{threshold_id} introuvable.")

    db.execute(text("DELETE FROM expense_thresholds WHERE id = :id"), {"id": threshold_id})
    db.commit()

    return {
        "status"      : "deleted",
        "threshold_id": threshold_id,
        "message"     : f"Seuil pour '{existing[1]}' supprimé."
    }