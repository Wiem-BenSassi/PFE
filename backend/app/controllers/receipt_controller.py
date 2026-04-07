# app/controllers/receipt_controller.py
from fastapi        import APIRouter, UploadFile, File, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy     import text
from pydantic       import BaseModel
from typing         import Optional
import traceback

from app.database.connection      import get_db
from app.services.receipt_service import process_receipt
from app.models.document_model    import Document, OcrResult

router = APIRouter()
ALLOWED_TYPES = ["image/jpeg","image/jpg","image/png","application/pdf"]


def _resolve_user_id(username: Optional[str], db: Session) -> int:
    """Cherche l'id réel de l'utilisateur depuis le username (header X-Username)."""
    if username:
        row = db.execute(
            text("SELECT id FROM users WHERE username=:u OR email=:u LIMIT 1"),
            {"u": username}
        ).fetchone()
        if row:
            return row[0]
    # Fallback : premier user actif
    row = db.execute(
        text("SELECT id FROM users WHERE is_active=TRUE ORDER BY id LIMIT 1")
    ).fetchone()
    if row:
        return row[0]
    raise HTTPException(400, "Aucun utilisateur actif trouvé en base.")


# ══════════════════════════════════════════════════════════════
# POST /receipts/upload
# ══════════════════════════════════════════════════════════════
@router.post("/upload")
async def upload_receipt(
    file      : UploadFile = File(...),
    db        : Session    = Depends(get_db),
    x_username: Optional[str] = Header(default=None, alias="X-Username"),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Type non accepté: {file.content_type}")
    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(400, "Fichier trop grand. Max 20MB")

    uploaded_by = _resolve_user_id(x_username, db)

    try:
        raw = process_receipt(
            file_bytes=file_bytes, file_name=file.filename,
            content_type=file.content_type, uploaded_by=uploaded_by, db=db
        )
        return raw
    except HTTPException:
        raise
    except Exception as e:
        print("="*60); print(traceback.format_exc()); print("="*60)
        raise HTTPException(500, str(e))


# ══════════════════════════════════════════════════════════════
# POST /receipts/confirm-review
# ══════════════════════════════════════════════════════════════
class ReviewPayload(BaseModel):
    document_id   : int
    merchant_name : Optional[str]   = None
    receipt_date  : Optional[str]   = None
    total_amount  : Optional[float] = None
    currency      : Optional[str]   = None
    payment_method: Optional[str]   = None
    category_code : Optional[str]   = None
    notes         : Optional[str]   = None

@router.post("/confirm-review")
def confirm_review(
    payload   : ReviewPayload,
    db        : Session = Depends(get_db),
    x_username: Optional[str] = Header(default=None, alias="X-Username"),
):
    doc = db.query(Document).filter(Document.id == payload.document_id).first()
    if not doc:
        raise HTTPException(404, "Document non trouvé")
    row = db.execute(
        text("SELECT id FROM expense_receipts WHERE document_id=:did LIMIT 1"),
        {"did": payload.document_id}
    ).fetchone()
    if not row:
        raise HTTPException(404, "Note de frais non trouvée")

    rid         = row[0]
    approved_by = _resolve_user_id(x_username, db)

    upd = {"status":"validated","approved_by":approved_by}
    if payload.merchant_name : upd["merchant_name"]    = payload.merchant_name
    if payload.receipt_date  : upd["receipt_date"]     = payload.receipt_date
    if payload.total_amount is not None:
        upd["total_amount"] = upd["total_amount_tnd"]  = payload.total_amount
    if payload.currency      : upd["currency_code"]    = payload.currency
    if payload.payment_method: upd["payment_method"]   = payload.payment_method
    if payload.category_code : upd["category_code"]    = payload.category_code
    if payload.notes         : upd["notes"]            = payload.notes

    set_clause = ", ".join(f"{k}=:{k}" for k in upd)
    db.execute(text(f"UPDATE expense_receipts SET {set_clause} WHERE id=:rid"), {**upd,"rid":rid})
    db.execute(text("UPDATE documents SET status='validated' WHERE id=:did"), {"did":payload.document_id})
    db.commit()
    return {"status":"confirmed","receipt_id":rid,"document_id":payload.document_id,"message":"Note de frais confirmée"}


# ══════════════════════════════════════════════════════════════
# GET /receipts/{document_id}
# ══════════════════════════════════════════════════════════════
@router.get("/{document_id}")
def get_receipt(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document non trouvé")
    ocr = db.query(OcrResult).filter(OcrResult.document_id == document_id).first()
    r = db.execute(text("""
        SELECT id, merchant_name, receipt_date, total_amount,
               total_amount_tnd, currency_code, payment_method,
               category_code, status, threshold_result, tax_amount
        FROM expense_receipts WHERE document_id=:did LIMIT 1
    """), {"did": document_id}).fetchone()

    return {
        "document_id"          : doc.id,
        "receipt_id"           : r[0]  if r else None,
        "file_name"            : doc.file_name,
        "status"               : doc.status,
        "ocr_confidence"       : float(ocr.ocr_confidence)        if ocr else 0,
        "extraction_confidence": float(ocr.extraction_confidence) if ocr else 0,
        "extracted_fields"     : ocr.extracted_json               if ocr else {},
        "raw_text"             : ocr.raw_text                     if ocr else "",
        "low_confidence_fields": ocr.low_confidence_fields        if ocr else [],
        "receipt_data": {
            "merchant_name"   : r[1],
            "receipt_date"    : str(r[2]) if r[2] else None,
            "total_amount"    : float(r[3]) if r[3] else None,
            "total_amount_tnd": float(r[4]) if r[4] else None,
            "currency"        : r[5] or "TND",
            "payment_method"  : r[6],
            "category_code"   : r[7],
            "status"          : r[8],
            "threshold_result": r[9],
        } if r else {}
    }


# ══════════════════════════════════════════════════════════════
# GET /receipts/
# ══════════════════════════════════════════════════════════════
@router.get("/")
def list_receipts(
    status      : Optional[str]  = None,
    category    : Optional[str]  = None,
    submitted_by: Optional[int]  = None,
    needs_review: Optional[bool] = None,
    limit       : int = 50,
    offset      : int = 0,
    db          : Session = Depends(get_db)
):
    where  = ["1=1"]
    params = {}
    if status:       where.append("er.status=:status");             params["status"]       = status
    if category:     where.append("er.category_code=:category");    params["category"]     = category
    if submitted_by: where.append("er.submitted_by=:submitted_by"); params["submitted_by"] = submitted_by

    rows = db.execute(text(f"""
        SELECT er.id, er.document_id, er.merchant_name, er.receipt_date,
               er.total_amount, er.total_amount_tnd, er.currency_code,
               er.category_code, er.status, er.threshold_result,
               ocr.extraction_confidence
        FROM expense_receipts er
        LEFT JOIN ocr_results ocr ON ocr.document_id = er.document_id
        WHERE {' AND '.join(where)}
        ORDER BY er.id DESC LIMIT :limit OFFSET :offset
    """), {**params,"limit":limit,"offset":offset}).fetchall()

    result = []
    for r in rows:
        conf   = float(r[10]) if r[10] else 0
        review = conf < 60.0 or r[8] == "pending"
        if needs_review is not None and review != needs_review:
            continue
        result.append({
            "receipt_id"      : r[0], "document_id": r[1],
            "merchant_name"   : r[2],
            "receipt_date"    : str(r[3]) if r[3] else None,
            "total_amount"    : float(r[4]) if r[4] else None,
            "total_amount_tnd": float(r[5]) if r[5] else None,
            "currency"        : r[6], "category_code": r[7],
            "status"          : r[8], "threshold_result": r[9],
            "extraction_score": conf, "needs_review": review,
        })
    return {"total": len(result), "receipts": result}


# ══════════════════════════════════════════════════════════════
# PATCH /receipts/{document_id}/validate  (rétro-compatibilité)
# ══════════════════════════════════════════════════════════════
class ReceiptValidationPayload(BaseModel):
    merchant_name   : Optional[str]   = None
    receipt_date    : Optional[str]   = None
    total_amount    : Optional[float] = None
    tax_amount      : Optional[float] = None
    currency        : Optional[str]   = None
    payment_method  : Optional[str]   = None
    category_code   : Optional[str]   = None
    notes           : Optional[str]   = None
    action          : str             = "validate"
    rejection_reason: Optional[str]   = None

@router.patch("/{document_id}/validate")
def validate_receipt(document_id: int, payload: ReceiptValidationPayload, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc: raise HTTPException(404, "Document non trouvé")
    r = db.execute(text("SELECT id FROM expense_receipts WHERE document_id=:did LIMIT 1"), {"did":document_id}).fetchone()
    if not r: raise HTTPException(404, "Note de frais non trouvée")
    rid = r[0]

    if payload.action == "reject":
        db.execute(text("UPDATE expense_receipts SET status='rejected',rejection_reason=:reason WHERE id=:rid"),
                   {"reason": payload.rejection_reason or "Rejeté", "rid": rid})
        db.execute(text("UPDATE documents SET status='rejected' WHERE id=:did"), {"did":document_id})
        db.commit()
        return {"status":"rejected","receipt_id":rid}

    upd = {"status":"validated","approved_by":1}
    if payload.merchant_name : upd["merchant_name"]    = payload.merchant_name
    if payload.receipt_date  : upd["receipt_date"]     = payload.receipt_date
    if payload.total_amount is not None: upd["total_amount"] = payload.total_amount
    if payload.currency      : upd["currency_code"]    = payload.currency
    if payload.payment_method: upd["payment_method"]   = payload.payment_method
    if payload.category_code : upd["category_code"]    = payload.category_code

    set_clause = ", ".join(f"{k}=:{k}" for k in upd)
    db.execute(text(f"UPDATE expense_receipts SET {set_clause} WHERE id=:rid"), {**upd,"rid":rid})
    db.execute(text("UPDATE documents SET status='validated' WHERE id=:did"), {"did":document_id})
    db.commit()
    return {"status":"validated","receipt_id":rid,"message":"Validée"}
