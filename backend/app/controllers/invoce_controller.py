# On importe APIRouter pour créer un routeur séparé pour organiser nos endpoints,
# UploadFile et File pour gérer les fichiers envoyés via HTTP.
from fastapi import APIRouter, UploadFile, File
from app.services.invoice_services import process_invoice
# Création d'un routeur FastAPI spécifique à la partie "invoice" (factures).

router = APIRouter()
# Définition d'un endpoint POST pour l'upload de factures.
# "/upload-invoice" est l'URL à laquelle le client enverra la facture.

@router.post("/upload-invoice")
async def upload_invoice(file: UploadFile = File(...)):
    result = process_invoice(file)
    return result