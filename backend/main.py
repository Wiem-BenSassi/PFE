# Point d'entrée principal de l'application FastAPI
# C'est ce fichier qu'on lance avec : uvicorn main:app --reload

import sys
import os

# On ajoute le dossier backend au chemin Python
# Ça permet d'importer nos modules avec "from app.xxx import yyy"
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# On importe les routeurs — chaque routeur gère un groupe d'endpoints
from app.controllers.invoice_controller import router as invoice_router
from auth.login import router as login_router

# Création de l'application FastAPI
app = FastAPI(title="Invoice API")

# Configuration CORS — indispensable pour que React (port 3000) puisse
# appeler notre API (port 8000) sans être bloqué par le navigateur
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # accepte les requêtes depuis n'importe quelle origine
    allow_credentials=True,
    allow_methods=["*"],        # accepte GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],        # accepte tous les headers
)

# Route de test — pour vérifier rapidement que l'API tourne bien
@app.get("/")
def root():
    return {"message": "API running"}

# On enregistre le routeur d'authentification sous le préfixe /auth
# Donc POST /login devient POST /auth/login
app.include_router(login_router, prefix="/auth", tags=["Authentication"])

# On enregistre le routeur des factures sous le préfixe /invoices
app.include_router(invoice_router, prefix="/invoices", tags=["Invoices"])