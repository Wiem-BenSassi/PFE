# ─── app/controllers/invoice_controller.py ───────────────────────────────────

from fastapi                      import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm               import Session
from sqlalchemy                   import text
from pydantic                     import BaseModel, Field
from typing                       import Optional
from app.database.connection      import get_db
from app.services.invoice_service import process_invoice
from app.models.document_model    import Document, OcrResult   # ← Correction ici
from app.models.invoice_model     import SupplierInvoice
from auth.rbac                    import ROLES, can, get_current_user, require_role
import traceback
from datetime import date

router = APIRouter()

ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"]


# ══════════════════════════════════════════════════════════════
# GET /invoices/threshold
# ══════════════════════════════════════════════════════════════
@router.get("/threshold")
def get_invoice_threshold(current_user = Depends(get_current_user)):
    """Retourne le seuil de validation automatique."""
    VALIDATION_THRESHOLD = 5000.0

    return {
        "threshold": VALIDATION_THRESHOLD,
        "currency": "TND",
        "description": f"Factures > {VALIDATION_THRESHOLD} TND nécessitent une validation manuelle."
    }


# ══════════════════════════════════════════════════════════════
# POST /invoices/upload
# ══════════════════════════════════════════════════════════════
@router.post("/upload")
async def upload_invoice(
    file      : UploadFile = File(...),
    file_type : str        = Form(default="expense"),
    db        : Session    = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Type non accepté : {file.content_type}")

    if file_type == "supplier_invoice":
        if not can(current_user.role, "upload_supplier_invoice"):
            raise HTTPException(
                403,
                "Accès refusé : seul le rôle Comptable peut uploader des factures fournisseur."
            )
    elif file_type == "expense":
        if not can(current_user.role, "upload_expense"):
            raise HTTPException(403, "Accès refusé")
    else:
        raise HTTPException(400, f"file_type invalide : '{file_type}'")

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(400, "Fichier trop grand. Max 20 Mo.")

    try:
        result = process_invoice(
            file_bytes=file_bytes,
            file_name=file.filename,
            content_type=file.content_type,
            uploaded_by=current_user.id,
            db=db,
        )
        result["file_type"] = file_type
        return result
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(500, f"Erreur interne : {str(e)}")


# ══════════════════════════════════════════════════════════════
# GET /invoices/{document_id}
# ══════════════════════════════════════════════════════════════
@router.get("/{document_id}")
def get_invoice(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document non trouvé")

    ocr = db.query(OcrResult).filter(OcrResult.document_id == document_id).first()
    inv = db.query(SupplierInvoice).filter(SupplierInvoice.document_id == document_id).first()

    extracted = ocr.extracted_json if ocr else {}

    return {
        "document_id": doc.id,
        "invoice_id": inv.id if inv else None,
        "file_name": doc.file_name,
        "status": doc.status,
        "ocr_confidence": float(ocr.ocr_confidence) if ocr else 0,
        "extraction_confidence": float(ocr.extraction_confidence) if ocr else 0,
        "extracted_fields": {k: v for k, v in extracted.items() if not k.startswith("_")},
        "needs_review": float(ocr.extraction_confidence) < 75.0 if ocr else True,
        "raw_text": ocr.raw_text if ocr else "",
    }


# ══════════════════════════════════════════════════════════════
# PATCH /invoices/{document_id}/validate
# ══════════════════════════════════════════════════════════════
class InvoiceValidationPayload(BaseModel):
    invoice_number   : Optional[str]   = None
    invoice_date     : Optional[str]   = None
    supplier_name    : Optional[str]   = None
    total_ht         : Optional[float] = None
    total_vat        : Optional[float] = None
    total_ttc        : Optional[float] = None
    currency         : Optional[str]   = None
    tax_id           : Optional[str]   = None
    notes            : Optional[str]   = None
    action           : str             = Field(default="validate")
    rejection_reason : Optional[str]   = None


@router.patch("/{document_id}/validate")
def validate_invoice(
    document_id: int,
    payload: InvoiceValidationPayload,
    db: Session = Depends(get_db),
    current_user = Depends(require_role([ROLES.COMPTABILITE, ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER])),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document non trouvé")

    inv = db.query(SupplierInvoice).filter(SupplierInvoice.document_id == document_id).first()
    if not inv:
        raise HTTPException(404, "Facture non trouvée")

    ocr = db.query(OcrResult).filter(OcrResult.document_id == document_id).first()

    if payload.action == "reject":
        inv.status = "rejected"
        inv.rejection_reason = payload.rejection_reason or "Rejeté manuellement"
        doc.status = "rejected"
        db.commit()
        return {"status": "rejected", "document_id": document_id}

    # Validation
    if payload.invoice_number:
        inv.invoice_number = payload.invoice_number
    if payload.invoice_date:
        try:
            inv.invoice_date = date.fromisoformat(payload.invoice_date)
        except ValueError:
            raise HTTPException(400, "Format de date invalide (YYYY-MM-DD)")

    if payload.total_ttc is not None:
        inv.total_ttc = payload.total_ttc
        inv.total_ttc_tnd = payload.total_ttc
    if payload.currency:
        inv.currency_code = payload.currency
    if payload.supplier_name:
        supplier_id = _find_or_create_supplier_id(payload.supplier_name, payload.tax_id or "", current_user.id, db)
        inv.supplier_id = supplier_id

    inv.status = "validated"
    inv.validated_by = current_user.id
    doc.status = "validated"

    db.commit()
    return {
        "status": "validated",
        "document_id": document_id,
        "invoice_id": inv.id,
        "message": "Facture validée avec succès"
    }


def _find_or_create_supplier_id(name: str, tax_id: str, created_by: int, db: Session) -> int:
    row = db.execute(text("SELECT id FROM suppliers WHERE LOWER(name) = LOWER(:name) LIMIT 1"), {"name": name}).fetchone()
    if row:
        return row[0]

    db.execute(
        text("""INSERT INTO suppliers (name, tax_id, country, is_active, created_by) 
                VALUES (:name, :tax_id, 'Tunisie', TRUE, :created_by)"""),
        {"name": name, "tax_id": tax_id, "created_by": created_by}
    )
    db.commit()
    row = db.execute(text("SELECT id FROM suppliers WHERE LOWER(name) = LOWER(:name) LIMIT 1"), {"name": name}).fetchone()
    return row[0]