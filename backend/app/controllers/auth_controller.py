# Ce fichier contient la logique métier du login
# Il est séparé du routeur pour garder le code propre et organisé
# Le routeur reçoit la requête → appelle ce contrôleur → retourne le résultat

from sqlalchemy.orm import Session
from app.models.user_model import User

# Fonction qui vérifie si un email + mot de passe correspondent à un utilisateur en base
# Retourne l'objet User si tout est correct, sinon retourne None
def login_user(db: Session, email: str, password: str):

    # On cherche un utilisateur avec cet email dans la table users
    user = db.query(User).filter(User.email == email).first()

    # Si aucun utilisateur trouvé avec cet email → échec
    if not user:
        return None

    # Si le mot de passe ne correspond pas → échec
    if user.password != password:
        return None

    # Email et mot de passe corrects → on retourne l'utilisateur
    return user