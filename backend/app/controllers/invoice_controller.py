from fastapi import APIRouter, UploadFile, File
from app.services.invoice_service import process_invoice

router = APIRouter()

@router.post("/upload")
async def upload_invoice(file: UploadFile = File(...)):
    """
    Upload an invoice file and process it
    """
    result = process_invoice(file)
    return result