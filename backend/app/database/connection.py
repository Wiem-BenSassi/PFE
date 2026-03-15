# Ce fichier gère la connexion entre notre application et la base de données PostgreSQL
# Il crée le "pont" qui permet à FastAPI de parler avec PostgreSQL

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# L'adresse complète de notre base de données
# Format : postgresql://utilisateur:mot_de_passe@hôte:port/nom_base
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/vernicolor_db"

# On crée le moteur de connexion — c'est lui qui ouvre la connexion physique avec PostgreSQL
engine = create_engine(DATABASE_URL)

# SessionLocal est une "fabrique" de sessions — chaque requête HTTP aura sa propre session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base est la classe parente de tous nos modèles (tables)
# Tous les modèles comme User hériteront de cette Base
Base = declarative_base()

# Cette fonction est injectée dans chaque endpoint qui a besoin de la base de données
# Elle ouvre une session, la passe à l'endpoint, puis la ferme automatiquement à la fin
def get_db():
    db = SessionLocal()
    try:
        yield db       # on "prête" la session à l'endpoint
    finally:
        db.close()     # on ferme toujours la session, même si une erreur survient