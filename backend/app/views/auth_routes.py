# Ce fichier définit les routes d'authentification
# Il fait le lien entre la requête HTTP et la logique dans auth_controller.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.controllers.auth_controller import login_user

router = APIRouter()

# Structure des données attendues dans le body de la requête POST /login
class LoginRequest(BaseModel):
    email: str
    password: str

# Fonction locale pour ouvrir/fermer une session base de données
# Chaque requête HTTP obtient sa propre session, isolée des autres
def get_db():
    db = SessionLocal()
    try:
        yield db       # on donne la session à l'endpoint
    finally:
        db.close()     # on ferme proprement après la requête

# Endpoint POST /login
# FastAPI injecte automatiquement la session db grâce à Depends(get_db)
@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):

    # On délègue la vérification au contrôleur
    user = login_user(db, data.email, data.password)

    # Si le contrôleur retourne None → email ou mot de passe incorrect
    if not user:
        raise HTTPException(status_code=401, detail="Invalid login")

    # Login réussi → on renvoie le rôle et le nom au frontend
    return {
        "message": "success",
        "role": user.role,
        "username": user.username
    }