# app/services/receipt_service.py
import hashlib, os, time, json
from datetime import datetime
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.regex_service              import extract_text_from_pdf_or_image
from app.services.receipt_extraction_service import extract_receipt_data_with_scores
from app.services.currency_detector          import detect_currency_smart, get_exchange_rate
from app.services.enrichment_service         import enrich_fields
from app.models.document_model               import Document, OcrResult

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def process_receipt(file_bytes, file_name, content_type, uploaded_by, db):
    # 1. Anti-doublon
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    existing  = db.query(Document).filter(Document.file_hash == file_hash).first()
    if existing:
        ocr = db.query(OcrResult).filter(OcrResult.document_id == existing.id).first()
        return {
            "status": "duplicate", "message": "Fichier déjà uploadé",
            "document_id": existing.id,
            "extracted_fields": ocr.extracted_json if ocr else {},
            "review_fields": {},
        }

    # 2. Sauvegarder fichier
    safe_name = file_name.replace(" ", "_")
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # 3. INSERT documents
    doc = Document(
        uploaded_by=uploaded_by, file_name=safe_name, file_path=file_path,
        file_type=content_type, file_size_kb=len(file_bytes)//1024,
        file_hash=file_hash, document_type="expense_receipt", status="ocr_processing"
    )
    db.add(doc); db.commit(); db.refresh(doc)

    # 4. OCR
    start      = time.time()
    ocr_result = extract_text_from_pdf_or_image(file_bytes, content_type)
    duration   = int((time.time() - start) * 1000)

    if ocr_result["status"] != "success" or not ocr_result.get("raw_text","").strip():
        doc.status = "ocr_failed"; db.commit()
        return {"status":"error","message":"OCR échoué","document_id":doc.id}

    raw_text = ocr_result["raw_text"]

    # 5. Extraction champs
    extraction       = extract_receipt_data_with_scores(raw_text)
    fields           = extraction.to_flat_dict()
    low_conf_list    = extraction.low_confidence_fields()
    extraction_score = extraction.global_score

    # 6. Devise
    currency_result   = detect_currency_smart(raw_text)
    detected_currency = currency_result["currency"]
    if not fields.get("currency") and detected_currency:
        fields["currency"] = detected_currency
    elif not fields.get("currency"):
        fields["currency"] = "TND"
    fields["currency_detection_method"]     = currency_result["method"]
    fields["currency_detection_confidence"] = currency_result["confidence"]

    # 7. Enrichissement
    fields = enrich_fields(fields, raw_text, fields.get("currency"))

    # 8. Update documents
    doc.detected_currency         = fields.get("currency","TND")
    doc.detected_language         = "fr"
    doc.status                    = "extraction_done"
    doc.classification_confidence = extraction_score
    db.commit()

    # 9. INSERT ocr_results
    ocr_row = OcrResult(
        document_id=doc.id, ocr_engine="PaddleOCR", ocr_version="PP-OCRv4",
        processing_time_ms=duration,
        ocr_confidence=ocr_result.get("confidence",0),
        extraction_confidence=extraction_score, ocr_status="success",
        raw_text=raw_text, extracted_json=fields,
        low_confidence_fields=low_conf_list, error_message=None
    )
    db.add(ocr_row); db.commit()

    # 10. Seuil
    total_amount     = float(fields.get("total_amount") or 0)
    total_amount_tnd = float(fields.get("total_amount_tnd") or total_amount)
    threshold_result = _check_threshold_by_role(total_amount_tnd, uploaded_by, db)

    # 11. INSERT expense_receipts
    receipt_date = extraction.receipt_date_obj or datetime.today().date()
    receipt_id   = _insert_expense_receipt(
        doc.id, uploaded_by, fields, receipt_date,
        total_amount, total_amount_tnd, threshold_result, db
    )

    # 12. review_fields pour React
    low_map = {item["field"]: item for item in low_conf_list}
    def rf(key, fallback=None):
        val = fields.get(key) or fallback
        low = key in low_map
        return {"value": val, "confidence": round(max(0.0, extraction_score-(25 if low else 0)), 1), "low": low}

    review_fields = {
        "merchant_name": rf("merchant_name"),
        "receipt_date" : rf("receipt_date"),
        "total_amount" : rf("total_amount"),
        "currency"     : {
            "value": fields.get("currency","TND"),
            "confidence": round(currency_result["confidence"]*100, 1),
            "low": currency_result["needs_user"],
        },
    }

    return {
        "status"               : "success",
        "document_id"          : doc.id,
        "receipt_id"           : receipt_id,
        "file_name"            : safe_name,
        "source"               : ocr_result.get("source","paddleocr"),
        "ocr_confidence"       : ocr_result.get("confidence",0),
        "extraction_score"     : extraction_score,
        "extracted_fields"     : fields,
        "review_fields"        : review_fields,
        "currency_detection"   : currency_result,
        "total_amount_tnd"     : total_amount_tnd,
        "threshold_result"     : threshold_result,
        "low_confidence_fields": low_conf_list,
        "needs_review"         : extraction.needs_review or currency_result["needs_user"],
        "processing_time_ms"   : duration,
    }


def _insert_expense_receipt(document_id, submitted_by, fields, receipt_date,
                             total_amount, total_amount_tnd, threshold_result, db):
    extracted_json_str = json.dumps(fields, ensure_ascii=False, default=str)
    db.execute(text("""
        INSERT INTO expense_receipts (
            document_id, submitted_by, receipt_date, receipt_time,
            merchant_name, currency_code, exchange_rate_to_tnd,
            total_amount, total_amount_tnd, tax_amount,
            payment_method, category_code, category_source,
            threshold_id, threshold_result, threshold_amount_tnd,
            status, extracted_data, is_duplicate
        ) VALUES (
            :document_id, :submitted_by, :receipt_date, :receipt_time,
            :merchant_name, :currency_code, :exchange_rate,
            :total_amount, :total_amount_tnd, :tax_amount,
            :payment_method, :category_code, 'ai',
            :threshold_id, :threshold_result, :threshold_amount_tnd,
            :status, :extracted_data, FALSE
        )
    """), {
        "document_id"         : document_id,
        "submitted_by"        : submitted_by,
        "receipt_date"        : receipt_date,
        "receipt_time"        : fields.get("receipt_time"),
        "merchant_name"       : (fields.get("merchant_name") or "Inconnu")[:300],
        "currency_code"       : fields.get("currency","TND"),
        "exchange_rate"       : float(fields.get("exchange_rate_to_tnd") or 1.0),
        "total_amount"        : total_amount,
        "total_amount_tnd"    : total_amount_tnd,
        "tax_amount"          : float(fields.get("tax_amount") or 0),
        "payment_method"      : fields.get("payment_method"),
        "category_code"       : fields.get("category_code","other"),
        "threshold_id"        : threshold_result.get("threshold_id"),
        "threshold_result"    : threshold_result.get("status","pending"),
        "threshold_amount_tnd": total_amount_tnd,
        "status"              : threshold_result.get("status","pending"),
        "extracted_data"      : extracted_json_str,
    })
    db.commit()
    row = db.execute(
        text("SELECT id FROM expense_receipts WHERE document_id=:did LIMIT 1"),
        {"did": document_id}
    ).fetchone()
    return row[0] if row else None


def _check_threshold_by_role(amount_tnd, user_id, db):
    user_row = db.execute(
        text("SELECT role FROM users WHERE id=:uid LIMIT 1"), {"uid": user_id}
    ).fetchone()
    if not user_row:
        return {"status":"pending","threshold_id":None,"message":"User non trouvé"}

    t = db.execute(text("""
        SELECT id, max_amount_tnd, auto_approve_below_tnd
        FROM expense_thresholds
        WHERE role_name=:role AND is_active=TRUE LIMIT 1
    """), {"role": user_row[0]}).fetchone()

    if not t:
        return {"status":"pending","threshold_id":None,"message":f"Pas de seuil pour {user_row[0]}"}

    tid, max_a, auto_a = t[0], float(t[1]), float(t[2] or 0)
    status = "auto_rejected" if amount_tnd > max_a else "auto_approved" if amount_tnd <= auto_a else "pending"
    return {"status":status,"threshold_id":tid,"max_amount":max_a,"auto_approve":auto_a,
            "role":user_row[0],"message":f"{amount_tnd:.3f} TND → {status}"}
