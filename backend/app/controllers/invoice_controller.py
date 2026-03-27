# app/controllers/invoice_controller.py
# ============================================================
# VERSION PRODUCTION — PFE Vernicolor
# Ajouts : endpoint PATCH /validate, GET avec détail scores
# ============================================================

from fastapi                          import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm                   import Session
from sqlalchemy                       import text
from pydantic                         import BaseModel, Field
from typing                           import Optional
from app.database.connection          import get_db
from app.services.invoice_service     import process_invoice
from app.models.document_model        import Document, OcrResult
from app.models.invoice_model         import SupplierInvoice
import traceback

router = APIRouter()

ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"]


# ══════════════════════════════════════════════════════════════
# POST /invoices/upload
# ══════════════════════════════════════════════════════════════

@router.post("/upload")
async def upload_invoice(
    file : UploadFile = File(...),
    db   : Session    = Depends(get_db)
):
    """Upload + traitement complet d'une facture fournisseur."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Type non accepté: {file.content_type}")

    file_bytes = await file.read()

    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(400, "Fichier trop grand. Max 20MB")

    try:
        return process_invoice(
            file_bytes   = file_bytes,
            file_name    = file.filename,
            content_type = file.content_type,
            uploaded_by  = 1,       # TODO: remplacer par l'user JWT
            db           = db,
        )
    except HTTPException:
        raise
    except Exception as e:
        print("=" * 60)
        print(traceback.format_exc())
        print("=" * 60)
        raise HTTPException(500, str(e))


# ══════════════════════════════════════════════════════════════
# GET /invoices/{document_id}
# ══════════════════════════════════════════════════════════════

@router.get("/{document_id}")
def get_invoice(document_id: int, db: Session = Depends(get_db)):
    """
    Retourne les données complètes d'une facture avec les scores
    de confiance par champ → pour le formulaire de révision React.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Facture non trouvée")

    ocr = db.query(OcrResult).filter(OcrResult.document_id == document_id).first()
    inv = db.query(SupplierInvoice).filter(SupplierInvoice.document_id == document_id).first()

    extracted = ocr.extracted_json if ocr else {}
    detailed  = extracted.get("_detailed", {})

    return {
        "document_id":      doc.id,
        "invoice_id":       inv.id   if inv else None,
        "supplier_id":      inv.supplier_id if inv else None,

        "file_name":        doc.file_name,
        "file_type":        doc.file_type,
        "status":           doc.status,
        "document_type":    doc.document_type,

        "ocr_confidence":       float(ocr.ocr_confidence)        if ocr else 0,
        "extraction_confidence": float(ocr.extraction_confidence) if ocr else 0,

        "extracted_fields": {k: v for k, v in extracted.items() if not k.startswith("_")},
        "fields_detail":    detailed,

        "low_confidence_fields": ocr.low_confidence_fields if ocr else [],
        "needs_review": (
            float(ocr.extraction_confidence) < 75.0 if ocr else True
        ),

        "raw_text":  ocr.raw_text if ocr else "",
        "invoice_status": inv.status if inv else None,
    }


# ══════════════════════════════════════════════════════════════
# PATCH /invoices/{document_id}/validate
# Validation manuelle depuis le frontend React
# ══════════════════════════════════════════════════════════════

class InvoiceValidationPayload(BaseModel):
    """
    Payload envoyé par le formulaire React après révision manuelle.
    Tous les champs sont optionnels : seul ce qui est modifié est envoyé.
    """
    invoice_number : Optional[str]   = None
    invoice_date   : Optional[str]   = None
    supplier_name  : Optional[str]   = None
    total_ht       : Optional[float] = None
    total_vat      : Optional[float] = None
    total_ttc      : Optional[float] = None
    currency       : Optional[str]   = None
    tax_id         : Optional[str]   = None
    notes          : Optional[str]   = None
    action         : str             = Field(default="validate",
                                             description="'validate' | 'reject'")
    rejection_reason : Optional[str] = None


@router.patch("/{document_id}/validate")
def validate_invoice(
    document_id : int,
    payload     : InvoiceValidationPayload,
    db          : Session = Depends(get_db)
):
    """
    Validation manuelle d'une facture depuis le frontend.

    Workflow :
    1. Récupère la facture et le résultat OCR
    2. Applique les corrections manuelles
    3. Met à jour supplier_invoices + ocr_results
    4. Status → 'validated' ou 'rejected'
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document non trouvé")

    inv = db.query(SupplierInvoice).filter(SupplierInvoice.document_id == document_id).first()
    if not inv:
        raise HTTPException(404, "Facture non trouvée (supplier_invoices)")

    ocr = db.query(OcrResult).filter(OcrResult.document_id == document_id).first()

    # ── Action : REJECT ───────────────────────────────────────
    if payload.action == "reject":
        inv.status           = "rejected"
        inv.rejection_reason = payload.rejection_reason or "Rejeté manuellement"
        doc.status           = "rejected"
        db.commit()
        return {"status": "rejected", "document_id": document_id, "invoice_id": inv.id}

    # ── Action : VALIDATE (avec corrections éventuelles) ──────
    from datetime import date

    if payload.invoice_number:
        inv.invoice_number = payload.invoice_number
    if payload.invoice_date:
        try:
            inv.invoice_date = date.fromisoformat(payload.invoice_date)
        except ValueError:
            raise HTTPException(400, f"Format date invalide: {payload.invoice_date} (attendu YYYY-MM-DD)")
    if payload.total_ht  is not None: inv.total_ht  = payload.total_ht
    if payload.total_vat is not None: inv.total_vat = payload.total_vat
    if payload.total_ttc is not None:
        inv.total_ttc     = payload.total_ttc
        inv.total_ttc_tnd = payload.total_ttc     # TODO: appliquer taux de change si devise ≠ TND
    if payload.currency:
        inv.currency_code = payload.currency
    if payload.notes:
        inv.notes = payload.notes

    # Gérer le changement de fournisseur
    if payload.supplier_name:
        supplier_id = _find_or_create_supplier_id(
            name=payload.supplier_name,
            tax_id=payload.tax_id or "",
            created_by=1,      # TODO: JWT user
            db=db
        )
        inv.supplier_id = supplier_id

    inv.status       = "validated"
    inv.validated_by = 1          # TODO: JWT user
    doc.status       = "validated"

    # Mettre à jour extracted_json dans ocr_results pour refléter la correction
    if ocr and ocr.extracted_json:
        updated_json = dict(ocr.extracted_json)
        for field in ["invoice_number", "invoice_date", "supplier_name",
                       "total_ht", "total_vat", "total_ttc", "currency", "tax_id"]:
            val = getattr(payload, field, None)
            if val is not None:
                updated_json[field] = str(val) if not isinstance(val, (int, float)) else val
                updated_json["_manually_corrected"] = updated_json.get("_manually_corrected", [])
                if field not in updated_json["_manually_corrected"]:
                    updated_json["_manually_corrected"].append(field)
        ocr.extracted_json = updated_json
        # Marquer comme validé → extraction_confidence = 100
        ocr.extraction_confidence = 100.0

    db.commit()

    return {
        "status":      "validated",
        "document_id": document_id,
        "invoice_id":  inv.id,
        "message":     "Facture validée avec succès",
    }


# ══════════════════════════════════════════════════════════════
# GET /invoices/ — Liste des factures avec filtres
# ══════════════════════════════════════════════════════════════

@router.get("/")
def list_invoices(
    status          : Optional[str] = None,
    needs_review    : Optional[bool] = None,
    supplier_id     : Optional[int]  = None,
    limit           : int = 50,
    offset          : int = 0,
    db              : Session = Depends(get_db)
):
    """Liste des factures avec filtres optionnels."""
    q = db.query(SupplierInvoice)

    if status:
        q = q.filter(SupplierInvoice.status == status)
    if supplier_id:
        q = q.filter(SupplierInvoice.supplier_id == supplier_id)

    total   = q.count()
    invoices = q.order_by(SupplierInvoice.id.desc()).offset(offset).limit(limit).all()

    result = []
    for inv in invoices:
        ocr = db.query(OcrResult).filter(OcrResult.document_id == inv.document_id).first()
        conf = float(ocr.extraction_confidence) if ocr else 0
        review_needed = conf < 75.0 or inv.status == "pending"

        if needs_review is not None and review_needed != needs_review:
            continue

        result.append({
            "invoice_id":       inv.id,
            "document_id":      inv.document_id,
            "supplier_id":      inv.supplier_id,
            "invoice_number":   inv.invoice_number,
            "invoice_date":     str(inv.invoice_date) if inv.invoice_date else None,
            "total_ttc":        float(inv.total_ttc or 0),
            "currency":         inv.currency_code,
            "status":           inv.status,
            "needs_review":     review_needed,
            "extraction_score": conf,
        })

    return {"total": total, "invoices": result}


# ══════════════════════════════════════════════════════════════
# HELPER interne
# ══════════════════════════════════════════════════════════════

def _find_or_create_supplier_id(name: str, tax_id: str, created_by: int, db: Session) -> int:
    row = db.execute(
        text("SELECT id FROM suppliers WHERE LOWER(name) = LOWER(:name) LIMIT 1"),
        {"name": name}
    ).fetchone()
    if row:
        return row[0]

    db.execute(
        text("""
            INSERT INTO suppliers (name, tax_id, country, is_active, created_by)
            VALUES (:name, :tax_id, 'Tunisie', TRUE, :created_by)
        """),
        {"name": name, "tax_id": tax_id, "created_by": created_by}
    )
    db.commit()
    row = db.execute(
        text("SELECT id FROM suppliers WHERE LOWER(name) = LOWER(:name) LIMIT 1"),
        {"name": name}
    ).fetchone()
    return row[0]