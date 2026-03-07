from fastapi import APIRouter, UploadFile, File
from app.services.invoice_services import process_invoice

router = APIRouter()

@router.post("/upload-invoice")
async def upload_invoice(file: UploadFile = File(...)):
    result = process_invoice(file)
    return result