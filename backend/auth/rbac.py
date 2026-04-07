# ─── app/auth/rbac.py ────────────────────────────────────────────────────────
# VERSION CORRIGÉE - Rôles alignés avec le frontend React

from fastapi           import Depends, HTTPException, Header
from sqlalchemy.orm    import Session
from sqlalchemy        import text
from app.database.connection import get_db
from typing            import List, Optional


class ROLES:
    ADMIN_SYSTEME = "Administrateur Système"
    ADMIN_METIER  = "Administrateur"
    COMPTABILITE  = "Comptable"                 # ← CORRIGÉ (était "comptabilité")
    EMPLOYE       = "Utilisateur"


PERMISSIONS = {
    "upload_expense"          : [ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER, ROLES.COMPTABILITE, ROLES.EMPLOYE],
    "upload_supplier_invoice" : [ROLES.COMPTABILITE, ROLES.ADMIN_SYSTEME],
    "view_dashboard"          : [ROLES.COMPTABILITE, ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER],
    "manage_users"            : [ROLES.ADMIN_SYSTEME],
    "manage_thresholds"       : [ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER],
    "view_admin_dashboard"    : [ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER],
    "manage_admin"            : [ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER],
}


def can(role: str, action: str) -> bool:
    return role in PERMISSIONS.get(action, [])


def get_current_user(
    x_user_id: Optional[int] = Header(default=None, alias="X-User-Id"),
    x_username: Optional[str] = Header(default=None, alias="X-Username"),
    db: Session = Depends(get_db)
):
    """
    Récupère l'utilisateur via X-User-Id (prioritaire) ou X-Username.
    Fallback dev : Administrateur Système.
    """
    if x_user_id is not None:
        from app.models.user_model import User
        user = db.query(User).filter(User.id == x_user_id).first()
        if user:
            return user

    if x_username:
        row = db.execute(
            text("SELECT id, username, role FROM users WHERE username = :u OR email = :u LIMIT 1"),
            {"u": x_username}
        ).fetchone()
        if row:
            class ResolvedUser:
                id = row[0]
                username = row[1]
                role = row[2]
            return ResolvedUser()

    # Fallback développement (à supprimer en production)
    class FakeUser:
        id = 0
        role = ROLES.ADMIN_SYSTEME
        username = "dev"
    return FakeUser()


def require_role(allowed_roles: List[str]):
    def dependency(current_user = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Accès refusé. Rôle requis : {', '.join(allowed_roles)}"
            )
        return current_user
    return dependency