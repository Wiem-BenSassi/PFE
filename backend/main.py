# main.py
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Connexion DB
from app.database.connection import Base, engine

# Import des modèles
from app.models import document_model, invoice_model, receipt_model

Base.metadata.create_all(bind=engine)

# Routers
from app.controllers.invoice_controller import router as invoice_router
from app.controllers.receipt_controller import router as receipt_router
from app.controllers.admin_controller   import router as admin_router
from auth.login                         import router as login_router
from app.controllers.system_admin_controller import router as sysadmin_router
# 1. Importer le router :
from app.controllers.budget_controller import router as budget_router
 

app = FastAPI(
    title="Vernicolor Invoice API",
    description="AI-powered invoice and expense processing system",
    version="1.0.0"
)

# CORS - Ajout du port 3001
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",      # ← Ajouté
        "http://127.0.0.1:3001",      # ← Ajouté
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "Vernicolor API running ✅",
        "docs": "http://localhost:8000/docs"
    }
app.include_router(sysadmin_router, prefix="/sysadmin", tags=["System Admin"])
app.include_router(login_router,   prefix="/auth",     tags=["Authentication"])
app.include_router(invoice_router, prefix="/invoices", tags=["Invoices"])
app.include_router(receipt_router, prefix="/receipts", tags=["Expense Receipts"])
app.include_router(admin_router,   prefix="/admin",    tags=["Admin"])
app.include_router(budget_router, prefix="/budget", tags=["Budget"])