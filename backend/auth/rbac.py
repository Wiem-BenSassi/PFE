# ─── app/auth/rbac.py ────────────────────────────────────────────────────────
# Gestion simple des rôles (RBAC) pour FastAPI.
#
# Usage dans un endpoint :
#
#   from app.auth.rbac import require_role, ROLES
#
#   @router.post("/upload")
#   async def upload(current_user = Depends(require_role([ROLES.COMPTABILITE, ROLES.ADMIN_SYSTEME]))):
#       ...
#
# Pour l'instant, le rôle est lu depuis la table users (via JWT ou session).
# Si tu n'as pas encore de JWT, tu peux temporairement passer le rôle
# en header HTTP depuis le frontend : X-User-Role: comptabilité
# ─────────────────────────────────────────────────────────────────────────────

from fastapi           import Depends, HTTPException, Header
from sqlalchemy.orm    import Session
from app.database.connection import get_db
from app.models.user_model   import User
from typing                  import List, Optional


# ── Constantes des rôles ──────────────────────────────────────────────────────
# Doivent correspondre exactement aux valeurs stockées dans la colonne `role`
# de la table `users` en base de données.

class ROLES:
    ADMIN_SYSTEME = "Administrateur Système"   # accès complet
    ADMIN_METIER  = "Administrateur"            # gestion des seuils
    COMPTABILITE  = "comptabilité"              # upload factures fournisseur
    EMPLOYE       = "Utilisateur"               # upload notes de frais uniquement


# ── Matrice des permissions ───────────────────────────────────────────────────
# Dictionnaire : action → liste des rôles autorisés
# Facile à étendre sans modifier les endpoints

PERMISSIONS = {
    # Upload
    "upload_expense"          : [ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER, ROLES.COMPTABILITE, ROLES.EMPLOYE],
    "upload_supplier_invoice" : [ROLES.COMPTABILITE, ROLES.ADMIN_SYSTEME],

    # Dashboard
    "view_dashboard"          : [ROLES.COMPTABILITE, ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER],

    # Gestion utilisateurs
    "manage_users"            : [ROLES.ADMIN_SYSTEME],

    # Gestion des seuils
    "manage_thresholds"       : [ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER],
    # module administrateur
    "view_admin_dashboard"    : [ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER],
    "manage_admin"            : [ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER],
}


def can(role: str, action: str) -> bool:
    """
    Vérifie si un rôle a la permission d'effectuer une action.

    Usage :
        if not can(user.role, "upload_supplier_invoice"):
            raise HTTPException(403, "Accès refusé")
    """
    allowed_roles = PERMISSIONS.get(action, [])
    return role in allowed_roles


# ── Dépendance FastAPI ────────────────────────────────────────────────────────
# Version simplifiée sans JWT — utilise un header X-User-Id pour identifier
# l'utilisateur et lire son rôle depuis la base de données.
#
# À remplacer par une vraie dépendance JWT quand tu implémenteras
# l'authentification par token.

def get_current_user(
    x_user_id: Optional[int] = Header(default=None, alias="X-User-Id"),
    db: Session = Depends(get_db)
) -> User:
    """
    Récupère l'utilisateur courant depuis le header X-User-Id.
    Temporaire — à remplacer par JWT.
    """
    if x_user_id is None:
        # En développement, on retourne un utilisateur fictif avec tous les droits
        # ⚠️ À désactiver en production !
        class FakeUser:
            id   = 0
            role = ROLES.ADMIN_SYSTEME
            username = "dev"
        return FakeUser()

    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return user


def require_role(allowed_roles: List[str]):
    """
    Dépendance FastAPI qui vérifie que l'utilisateur a l'un des rôles autorisés.

    Usage dans un endpoint :
        @router.get("/admin")
        def admin_only(user = Depends(require_role([ROLES.ADMIN_SYSTEME]))):
            ...
    """
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code = 403,
                detail      = f"Accès refusé. Rôle requis : {', '.join(allowed_roles)}"
            )
        return current_user
    return dependency