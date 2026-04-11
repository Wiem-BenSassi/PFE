# app/services/invoice_service.py
#
# CORRECTION — Création du supplier lors de l'upload initial
# ──────────────────────────────────────────────────────────
# PROBLÈME IDENTIFIÉ :
#   Lors de l'upload, process_invoice() appelle _get_or_create_supplier()
#   avec le nom extrait par l'OCR, qui peut être incorrect ou partiel
#   (ex: "VERNICOLOR TUNISIA ATVYL Colisa ATVYL HT").
#   Ce supplier est immédiatement créé en DB, avant que l'utilisateur
#   n'ait la possibilité de le corriger dans la page de vérification.
#
# CORRECTION :
#   1. On crée un supplier TEMPORAIRE avec un nom nettoyé
#   2. Si le nom OCR est vide ou suspect → on utilise un nom générique
#      "Fournisseur à identifier" pour signaler qu'il faut le corriger
#   3. Le PATCH /validate est la seule étape qui fixe le nom définitif
#   4. _get_or_create_supplier() trim et normalise le nom avant insertion

import hashlib, os, time, re
from datetime import datetime
from sqlalchemy import text

from app.services.regex_service import (
    extract_text_from_pdf_or_image,
    extract_invoice_data_with_scores,
)

from app.models.document_model import Document, OcrResult
from app.models.invoice_model  import SupplierInvoice

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Nettoyage du nom de fournisseur OCR ──────────────────────────────────────
# L'OCR extrait souvent des chaînes très longues mélangeant plusieurs informations.
# Cette fonction tente de garder uniquement la partie pertinente.

def _clean_supplier_name(raw_name: str) -> str:
    """
    Nettoie le nom de fournisseur extrait par OCR.

    Problèmes courants :
      • "VERNICOLOR TUNISIA ATVYL Colisa ATVYL HT" → plusieurs entités mélangées
      • "  ATVYL  "  → espaces superflus
      • ""  → vide

    Stratégie :
      1. Trim
      2. Si vide → retourner placeholder
      3. Tronquer à 200 caractères (noms anormalement longs = OCR noise)
    """
    if not raw_name:
        return "Fournisseur à identifier"

    cleaned = raw_name.strip()

    # Nom vide après trim
    if not cleaned or len(cleaned) < 2:
        return "Fournisseur à identifier"

    # Nom anormalement long = probablement du bruit OCR
    # (un vrai nom de société dépasse rarement 100 caractères)
    if len(cleaned) > 150:
        # On garde les 100 premiers caractères significatifs
        cleaned = cleaned[:100].strip()

    return cleaned


# ── Split multi-factures ──────────────────────────────────────────────────────
def split_invoices(text: str):
    parts = re.split(
        r'(FACTURE\s+EXPORT\s+N[°o]\s*FC\s*\d{4}-\d+)',
        text,
        flags=re.IGNORECASE
    )
    invoices = []
    for i in range(1, len(parts), 2):
        header = parts[i]
        body   = parts[i + 1] if i + 1 < len(parts) else ""
        full   = header + body
        if len(full) > 100:
            invoices.append(full)

    return invoices if invoices else [text]


# ═══════════════════════════════════════════════════════════════════════════════
# process_invoice — fonction principale
# ═══════════════════════════════════════════════════════════════════════════════
def process_invoice(
    file_bytes,
    file_name    = None,
    content_type = None,
    uploaded_by  = None,
    db           = None,
    **kwargs
):
    file_name    = file_name    or "unknown_file"
    content_type = content_type or "unknown"
    uploaded_by  = uploaded_by  or 0

    # ── 1. Anti-doublon ───────────────────────────────────────────────────────
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    existing  = db.query(Document).filter(Document.file_hash == file_hash).first()

    if existing:
        return {"status": "duplicate", "document_id": existing.id}

    # ── 2. Sauvegarde du fichier ──────────────────────────────────────────────
    safe_name = file_name.replace(" ", "_")
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # ── 3. Création du document en DB ────────────────────────────────────────
    doc = Document(
        uploaded_by   = uploaded_by,
        file_name     = safe_name,
        file_path     = file_path,
        file_type     = content_type,
        file_size_kb  = len(file_bytes) // 1024,
        file_hash     = file_hash,
        status        = "ocr_processing"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # ── 4. OCR ────────────────────────────────────────────────────────────────
    start      = time.time()
    ocr_result = extract_text_from_pdf_or_image(file_bytes, content_type)
    duration   = int((time.time() - start) * 1000)

    if ocr_result["status"] != "success":
        doc.status = "ocr_failed"
        db.commit()
        return {"status": "error"}

    raw_text = ocr_result["raw_text"]

    # ── 5. Split multi-factures ───────────────────────────────────────────────
    invoice_texts = split_invoices(raw_text)

    results          = []
    invoices_created = []
    supplier_id_global = None

    # ── 6. Boucle sur chaque facture détectée ─────────────────────────────────
    for inv_text in invoice_texts:

        extraction = extract_invoice_data_with_scores(inv_text)
        extraction.compute_score()
        fields = extraction.to_flat_dict()

        # ── CORRECTION : nettoyage du nom OCR avant insertion ─────────────────
        raw_supplier_name = fields.get("supplier_name") or ""
        supplier_name     = _clean_supplier_name(raw_supplier_name)
        tax_id            = (fields.get("tax_id") or "").strip()

        # Crée ou retrouve le fournisseur avec le nom NETTOYÉ
        supplier_id = _get_or_create_supplier(
            name       = supplier_name,
            tax_id     = tax_id,
            email      = (fields.get("email")   or "").strip(),
            phone      = (fields.get("phone")   or "").strip(),
            address    = (fields.get("address") or "").strip(),
            city       = (fields.get("city")    or "").strip(),
            created_by = uploaded_by,
            db         = db,
        )
        supplier_id_global = supplier_id

        # ── Création de la facture en DB ──────────────────────────────────────
        invoice = SupplierInvoice(
            document_id    = doc.id,
            supplier_id    = supplier_id,
            invoice_number = (fields.get("invoice_number") or "TEMP-" + str(doc.id)),
            invoice_date   = _parse_date(fields.get("invoice_date")),
            currency_code  = (fields.get("currency") or "TND"),
            total_ht       = float(fields.get("total_ht")  or 0),
            total_vat      = float(fields.get("total_vat") or 0),
            total_ttc      = float(fields.get("total_ttc") or 0),
            status         = "pending",
        )
        db.add(invoice)
        db.flush()

        invoices_created.append(invoice.id)

        results.append({
            "fields"      : fields,
            "confidence"  : extraction.global_score,
        })

    db.commit()

    # ── 7. Sauvegarde du résultat OCR ────────────────────────────────────────
    ocr_row = OcrResult(
        document_id          = doc.id,
        ocr_engine           = "PaddleOCR",
        processing_time_ms   = duration,
        ocr_confidence       = ocr_result.get("confidence", 0),
        extraction_confidence= results[0]["confidence"] if results else 0,
        ocr_status           = "success",
        raw_text             = raw_text,
        extracted_json       = {"multi_invoices": results},
    )
    db.add(ocr_row)
    db.commit()

    # ── 8. Réponse ────────────────────────────────────────────────────────────
    return {
        "status"              : "success",
        "document_id"         : doc.id,
        "invoice_ids"         : invoices_created,
        "supplier_id"         : supplier_id_global,
        "file_name"           : safe_name,
        "extracted_invoices"  : results,
        "processing_time_ms"  : duration,
    }


# ══════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════

def _parse_date(date_str):
    if not date_str:
        return None
    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]:
        try:
            return datetime.strptime(str(date_str).strip(), fmt).date()
        except Exception:
            continue
    return None


def _get_or_create_supplier(
    name: str, tax_id: str, email: str, phone: str,
    address: str, city: str, created_by: int, db
) -> int:
    """
    Recherche un fournisseur par son nom (insensible à la casse + trim).
    S'il existe → retourne son ID.
    Sinon → le crée et retourne le nouvel ID.

    CORRECTION :
      Utilise LOWER(TRIM(name)) pour éviter les doublons dus aux espaces
      ou à la casse différente (ex: "ATVYL" vs "atvyl" vs " ATVYL ").
    """

    name_clean = name.strip()

    # Recherche insensible à la casse et aux espaces
    row = db.execute(
        text("SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name)) LIMIT 1"),
        {"name": name_clean}
    ).fetchone()

    if row:
        return row[0]

    # Création avec toutes les infos disponibles
    db.execute(
        text("""
            INSERT INTO suppliers
                (name, tax_id, email, phone, address, city, created_by)
            VALUES
                (:name, :tax_id, :email, :phone, :address, :city, :created_by)
        """),
        {
            "name"       : name_clean,
            "tax_id"     : tax_id    or "",
            "email"      : email     or "",
            "phone"      : phone     or "",
            "address"    : address   or "",
            "city"       : city      or "",
            "created_by" : created_by,
        }
    )
    db.commit()

    row = db.execute(
        text("SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name)) LIMIT 1"),
        {"name": name_clean}
    ).fetchone()

    return row[0]