# main.py
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import document_model, invoice_model
from app.database.connection import Base, engine

Base.metadata.create_all(bind=engine)

from app.controllers.invoice_controller import router as invoice_router
from app.controllers.admin_controller   import router as admin_router  # ← AJOUT
from auth.login                          import router as login_router

app = FastAPI(
    title       = "Vernicolor Invoice API",
    description = "AI-powered invoice processing system",
    version     = "1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

@app.get("/")
def root():
    return {
        "message": "Vernicolor API running ",
        "docs":    "http://localhost:8000/docs"
    }

app.include_router(login_router,   prefix="/auth",     tags=["Authentication"])
app.include_router(invoice_router, prefix="/invoices", tags=["Invoices"])
app.include_router(admin_router,   prefix="/admin",    tags=["Admin"])  # ← AJOUT
