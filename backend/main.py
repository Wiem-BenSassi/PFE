import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠  pip install python-dotenv")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.connection import Base, engine
from app.models import document_model, invoice_model, receipt_model
Base.metadata.create_all(bind=engine)

from app.controllers.invoice_controller      import router as invoice_router
from app.controllers.receipt_controller      import router as receipt_router
from app.controllers.admin_controller        import router as admin_router
from app.controllers.system_admin_controller import router as sysadmin_router
from app.controllers.budget_controller       import router as budget_router
from auth.login                              import router as login_router

app = FastAPI(title="Vernicolor Invoice API", version="1.0.0")

# ── CORS : lit FRONTEND_URL_MOBILE depuis .env automatiquement ───────────────
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://localhost",
    "http://127.0.0.1",
]

# Si FRONTEND_URL_MOBILE est défini dans .env → on l'ajoute
mobile_url = os.getenv("FRONTEND_URL_MOBILE", "")
if mobile_url:
    origins.append(mobile_url)
    print(f"📱 CORS mobile activé : {mobile_url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Vernicolor API running ✅"}

app.include_router(sysadmin_router, prefix="/sysadmin", tags=["System Admin"])
app.include_router(login_router,    prefix="/auth",     tags=["Authentication"])
app.include_router(invoice_router,  prefix="/invoices", tags=["Invoices"])
app.include_router(receipt_router,  prefix="/receipts", tags=["Expense Receipts"])
app.include_router(admin_router,    prefix="/admin",    tags=["Admin"])
app.include_router(budget_router,   prefix="/budget",   tags=["Budget"])