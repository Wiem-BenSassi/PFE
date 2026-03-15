# Ce fichier gère l'endpoint de connexion : POST /auth/login
# Quand un utilisateur soumet le formulaire de login, c'est ici que ça arrive

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from app.database.connection import get_db

router = APIRouter()

# Outil pour hasher et vérifier les mots de passe avec bcrypt
# (utile si on passe un jour aux mots de passe hashés en base)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Structure des données attendues dans la requête JSON
# FastAPI va automatiquement valider que email et password sont bien présents
class LoginRequest(BaseModel):
    email: str
    password: str

# Endpoint POST /login
# db est injecté automatiquement par FastAPI grâce à Depends(get_db)
@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):

    try:
        # On cherche l'utilisateur dans la base par son email
        # On récupère aussi son mot de passe pour le vérifier ensuite
        result = db.execute(
            text("SELECT username, role, password FROM users WHERE email = :email"),
            {"email": data.email}
        ).fetchone()

    except OperationalError as e:
        # Si PostgreSQL est inaccessible (mauvais mot de passe, serveur éteint, etc.)
        print("DATABASE ERROR:", repr(e))
        raise HTTPException(status_code=503, detail="Database connection failed")

    # Si aucun utilisateur trouvé, ou mot de passe incorrect → on refuse la connexion
    # result[2] correspond à la colonne "password" dans la requête SELECT
    if result is None or result[2] != data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Login réussi → on renvoie les infos de l'utilisateur au frontend
    return {
        "message": "login success",
        "username": result[0],   # result[0] = username
        "role": result[1]        # result[1] = role
    }