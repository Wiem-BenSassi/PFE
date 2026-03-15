# Ce fichier définit la structure de la table "users" dans PostgreSQL
# SQLAlchemy utilise cette classe pour savoir à quelle table et colonnes accéder
# C'est la représentation Python de la table SQL

from sqlalchemy import Column, Integer, String
from app.database.connection import Base

# La classe User hérite de Base — ça l'enregistre dans SQLAlchemy
class User(Base):

    # Nom exact de la table dans PostgreSQL
    __tablename__ = "users"

    # Colonne id — entier, clé primaire, avec index pour les recherches rapides
    id = Column(Integer, primary_key=True, index=True)

    # Nom d'affichage de l'utilisateur
    username = Column(String)

    # Email de l'utilisateur — doit être unique dans toute la table
    email = Column(String, unique=True)

    # Mot de passe — stocké en clair pour l'instant (à hasher plus tard avec bcrypt)
    password = Column(String)

    # Rôle de l'utilisateur (ex: "Directeur Générale", "Comptable", "stagiaire 1")
    # Utilisé pour contrôler les accès selon le profil
    role = Column(String)