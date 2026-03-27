# app/services/invoice_service.py

import hashlib, os, time, re
from datetime import datetime
from sqlalchemy import text

from app.services.regex_service import (
    extract_text_from_pdf_or_image,
    extract_invoice_data_with_scores,
)

from app.models.document_model import Document, OcrResult
from app.models.invoice_model import SupplierInvoice

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# 🔥 SPLIT CORRIGÉ (IMPORTANT)
def split_invoices(text):
    parts = re.split(
        r'(FACTURE\s+EXPORT\s+N[°o]\s*FC\s*\d{4}-\d+)',
        text,
        flags=re.IGNORECASE
    )

    invoices = []
    for i in range(1, len(parts), 2):
        header = parts[i]
        body = parts[i + 1] if i + 1 < len(parts) else ""
        full = header + body

        if len(full) > 100:
            invoices.append(full)

    # fallback (facture وحدة)
    if not invoices:
        invoices = [text]

    return invoices


def process_invoice(file_bytes, file_name=None, content_type=None,
                    uploaded_by=None, db=None, **kwargs):

    file_name = file_name or "unknown_file"
    content_type = content_type or "unknown"
    uploaded_by = uploaded_by or 0

    # ── 1. Anti-doublon ──
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    existing = db.query(Document).filter(Document.file_hash == file_hash).first()

    if existing:
        return {
            "status": "duplicate",
            "document_id": existing.id
        }

    # ── 2. Save file ──
    safe_name = file_name.replace(" ", "_")
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # ── 3. Create document ──
    doc = Document(
        uploaded_by=uploaded_by,
        file_name=safe_name,
        file_path=file_path,
        file_type=content_type,
        file_size_kb=len(file_bytes)//1024,
        file_hash=file_hash,
        status="ocr_processing"
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    # ── 4. OCR ──
    start = time.time()
    ocr_result = extract_text_from_pdf_or_image(file_bytes, content_type)
    duration = int((time.time() - start) * 1000)

    if ocr_result["status"] != "success":
        doc.status = "ocr_failed"
        db.commit()
        return {"status": "error"}

    raw_text = ocr_result["raw_text"]

    # 🔥 split invoices
    invoice_texts = split_invoices(raw_text)

    results = []
    invoices_created = []

    supplier_id_global = None

    # ── LOOP MULTI FACTURES ──
    for inv_text in invoice_texts:

        extraction = extract_invoice_data_with_scores(inv_text)
        extraction.compute_score()

        fields = extraction.to_flat_dict()
        # 🔥 supplier extraction clean
        supplier_name = fields.get("supplier_name") or "Fournisseur Inconnu"
        tax_id = fields.get("tax_id") or ""

        supplier_id = _get_or_create_supplier(
            name=supplier_name,
            tax_id=tax_id,
            email=fields.get("email", ""),
            phone=fields.get("phone", ""),
            address=fields.get("address", ""),
            city=fields.get("city", ""),
            created_by=uploaded_by,
            db=db
        )

        supplier_id_global = supplier_id

        # ── create invoice ──
        invoice = SupplierInvoice(
            document_id=doc.id,
            supplier_id=supplier_id,
            invoice_number=fields.get("invoice_number"),
            invoice_date=_parse_date(fields.get("invoice_date")),
            currency_code=fields.get("currency", "TND"),
            total_ht=float(fields.get("total_ht") or 0),
            total_vat=float(fields.get("total_vat") or 0),
            total_ttc=float(fields.get("total_ttc") or 0),
            status="pending"
        )

        db.add(invoice)
        db.flush()

        invoices_created.append(invoice.id)

        results.append({
            "fields": fields,
            "confidence": extraction.global_score,
            "needs_review": extraction.needs_review
        })

    db.commit()

    # ── Save OCR result ──
    ocr_row = OcrResult(
        document_id=doc.id,
        ocr_engine="PaddleOCR",
        processing_time_ms=duration,
        ocr_confidence=ocr_result.get("confidence", 0),
        extraction_confidence=results[0]["confidence"] if results else 0,
        ocr_status="success",
        raw_text=raw_text,
        extracted_json={"multi_invoices": results}
    )

    db.add(ocr_row)
    db.commit()

    # ── response ──
    return {
        "status": "success",
        "document_id": doc.id,
        "invoice_ids": invoices_created,
        "supplier_id": supplier_id_global,
        "file_name": safe_name,
        "extracted_invoices": results,
        "processing_time_ms": duration
    }


# ── HELPERS ──

def _parse_date(date_str):
    if not date_str:
        return None

    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
        try:
            return datetime.strptime(str(date_str), fmt).date()
        except:
            continue

    return None


def _get_or_create_supplier(name, tax_id, email, phone, address, city, created_by, db):

    row = db.execute(
        text("SELECT id FROM suppliers WHERE LOWER(name)=LOWER(:name) LIMIT 1"),
        {"name": name}
    ).fetchone()

    if row:
        return row[0]

    db.execute(text("""
        INSERT INTO suppliers (name, tax_id, email, phone, address, city, created_by)
        VALUES (:name, :tax_id, :email, :phone, :address, :city, :created_by)
    """), {
        "name": name,
        "tax_id": tax_id,
        "email": email,
        "phone": phone,
        "address": address,
        "city": city,
        "created_by": created_by
    })

    db.commit()

    row = db.execute(
        text("SELECT id FROM suppliers WHERE LOWER(name)=LOWER(:name) LIMIT 1"),
        {"name": name}
    ).fetchone()

    return row[0]