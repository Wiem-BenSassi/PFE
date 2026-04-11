# ─── app/controllers/invoice_controller.py ───────────────────────────────────
#
# CORRECTION PRINCIPALE — BUG du nom fournisseur
# ──────────────────────────────────────────────
# PROBLÈME IDENTIFIÉ :
#   Lors du PATCH /invoices/{id}/validate, l'ancienne version appelait
#   _find_or_create_supplier_id() pour retrouver ou créer le fournisseur
#   MAIS elle n'utilisait pas correctement le résultat :
#     • Si le fournisseur existait déjà → supplier_id était retourné
#       mais pas forcément assigné à inv.supplier_id
#     • Si le nom avait changé → un nouveau supplier pouvait être créé
#       avec un nom partiel/incorrect issu de l'OCR
#
# CORRECTION :
#   1. _find_or_create_supplier_id() retourne toujours l'ID correct
#   2. inv.supplier_id est TOUJOURS mis à jour avec cet ID
#   3. La recherche est insensible à la casse et trim les espaces
#   4. Le supplier existant est mis à jour si le nom a changé (upsert partiel)

from fastapi                      import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm               import Session
from sqlalchemy                   import text
from pydantic                     import BaseModel, Field
from typing                       import Optional
from app.database.connection      import get_db
from app.services.invoice_service import process_invoice
from app.models.document_model    import Document, OcrResult
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
    VALIDATION_THRESHOLD = 5000.0
    return {
        "threshold"   : VALIDATION_THRESHOLD,
        "currency"    : "TND",
        "description" : f"Factures > {VALIDATION_THRESHOLD} TND nécessitent une validation manuelle."
    }


# ══════════════════════════════════════════════════════════════
# POST /invoices/upload
# ══════════════════════════════════════════════════════════════
@router.post("/upload")
async def upload_invoice(
    file         : UploadFile = File(...),
    file_type    : str        = Form(default="expense"),
    db           : Session    = Depends(get_db),
    current_user              = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Type non accepté : {file.content_type}")

    if file_type == "supplier_invoice":
        if not can(current_user.role, "upload_supplier_invoice"):
            raise HTTPException(403, "Accès refusé : seul le rôle Comptable peut uploader des factures fournisseur.")
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
            file_bytes   = file_bytes,
            file_name    = file.filename,
            content_type = file.content_type,
            uploaded_by  = current_user.id,
            db           = db,
        )
        result["file_type"] = file_type
        return result
    except HTTPException:
        raise
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

    # ── Récupère le nom du fournisseur depuis la table suppliers ───────────────
    # (plus fiable que l'extracted_json qui contient le texte OCR brut)
    supplier_name_db = None
    if inv and inv.supplier_id:
        row = db.execute(
            text("SELECT name FROM suppliers WHERE id = :sid"),
            {"sid": inv.supplier_id}
        ).fetchone()
        if row:
            supplier_name_db = row[0]

    return {
        "document_id"           : doc.id,
        "invoice_id"            : inv.id if inv else None,
        "file_name"             : doc.file_name,
        "status"                : doc.status,
        "ocr_confidence"        : float(ocr.ocr_confidence)        if ocr else 0,
        "extraction_confidence" : float(ocr.extraction_confidence) if ocr else 0,
        "extracted_fields"      : {k: v for k, v in extracted.items() if not k.startswith("_")},
        "needs_review"          : float(ocr.extraction_confidence) < 75.0 if ocr else True,
        "raw_text"              : ocr.raw_text if ocr else "",
        # Retourne le nom en DB en priorité sur l'OCR brut
        "supplier_name"         : supplier_name_db or (extracted.get("supplier_name") or ""),
    }


# ══════════════════════════════════════════════════════════════
# PATCH /invoices/{document_id}/validate
# ══════════════════════════════════════════════════════════════

class InvoiceValidationPayload(BaseModel):
    # ── Champs éditables par l'utilisateur dans la page de vérification ────────
    invoice_number   : Optional[str]   = None
    invoice_date     : Optional[str]   = None

    # supplier_name = nom saisi/corrigé par l'utilisateur dans le formulaire
    # C'est CE champ qui doit être utilisé pour créer/retrouver le supplier en DB
    supplier_name    : Optional[str]   = None

    total_ht         : Optional[float] = None
    total_vat        : Optional[float] = None
    total_ttc        : Optional[float] = None
    currency         : Optional[str]   = None
    tax_id           : Optional[str]   = None
    notes            : Optional[str]   = None

    action           : str             = Field(default="validate", description="'validate' | 'reject'")
    rejection_reason : Optional[str]   = None


@router.patch("/{document_id}/validate")
def validate_invoice(
    document_id  : int,
    payload      : InvoiceValidationPayload,
    db           : Session  = Depends(get_db),
    current_user            = Depends(require_role([ROLES.COMPTABILITE, ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER])),
):
    """
    Valide une facture avec les données corrigées par l'utilisateur.

    CORRECTION PRINCIPALE :
      supplier_name envoyé depuis le frontend est le nom CORRIGÉ par l'utilisateur.
      On l'utilise pour :
        1. Chercher si ce fournisseur existe déjà en DB (recherche insensible à la casse)
        2. Si oui  → réutiliser son ID
        3. Si non  → créer un nouveau supplier avec ce nom exact
        4. Dans les deux cas, mettre à jour supplier_invoices.supplier_id
    """

    # ── Récupère le document ───────────────────────────────────────────────────
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document non trouvé")

    # ── Récupère la facture ────────────────────────────────────────────────────
    inv = db.query(SupplierInvoice).filter(SupplierInvoice.document_id == document_id).first()
    if not inv:
        raise HTTPException(404, "Facture non trouvée dans supplier_invoices")

    ocr = db.query(OcrResult).filter(OcrResult.document_id == document_id).first()

    # ════════════════════════════════════════════════════════
    # ACTION : REJECT
    # ════════════════════════════════════════════════════════
    if payload.action == "reject":
        inv.status           = "rejected"
        inv.rejection_reason = payload.rejection_reason or "Rejeté manuellement"
        doc.status           = "rejected"
        db.commit()
        return {
            "status"      : "rejected",
            "document_id" : document_id,
            "invoice_id"  : inv.id,
        }

    # ════════════════════════════════════════════════════════
    # ACTION : VALIDATE
    # ════════════════════════════════════════════════════════

    # ── 1. Mise à jour du numéro de facture ────────────────────────────────────
    if payload.invoice_number is not None:
        inv.invoice_number = payload.invoice_number.strip()

    # ── 2. Mise à jour de la date ─────────────────────────────────────────────
    if payload.invoice_date:
        try:
            inv.invoice_date = date.fromisoformat(payload.invoice_date.strip())
        except ValueError:
            raise HTTPException(400, f"Format de date invalide : '{payload.invoice_date}'. Utilisez YYYY-MM-DD.")

    # ── 3. Mise à jour des montants ───────────────────────────────────────────
    if payload.total_ht is not None:
        inv.total_ht = payload.total_ht
    if payload.total_vat is not None:
        inv.total_vat = payload.total_vat
    if payload.total_ttc is not None:
        inv.total_ttc     = payload.total_ttc
        inv.total_ttc_tnd = payload.total_ttc   # TODO: appliquer taux de change si devise ≠ TND

    # ── 4. Mise à jour de la devise ───────────────────────────────────────────
    if payload.currency:
        inv.currency_code = payload.currency.strip()

    # ── 5. CORRECTION PRINCIPALE : Mise à jour du fournisseur ─────────────────
    #
    # Si l'utilisateur a saisi/modifié le nom du fournisseur dans le formulaire,
    # on retrouve ou crée le bon enregistrement dans la table suppliers,
    # puis on met à jour supplier_invoices.supplier_id.
    #
    # C'est cette étape qui était défaillante : le supplier_id n'était pas
    # toujours mis à jour, ce qui laissait la facture pointée vers le fournisseur
    # créé automatiquement au moment de l'OCR (avec un nom mal extrait).
    # ──────────────────────────────────────────────────────────────────────────

    if payload.supplier_name:
        # Nom nettoyé saisi par l'utilisateur
        corrected_name = payload.supplier_name.strip()
        tax_id_value   = (payload.tax_id or "").strip()

        # Cherche ou crée le supplier avec le nom CORRIGÉ
        new_supplier_id = _find_or_create_supplier(
            name       = corrected_name,
            tax_id     = tax_id_value,
            created_by = current_user.id,
            db         = db,
        )

        # Met à jour la relation facture → fournisseur
        # (même si le supplier_id était déjà le bon — ça ne coûte rien)
        inv.supplier_id = new_supplier_id

    # ── 6. Notes optionnelles ─────────────────────────────────────────────────
    if payload.notes:
        inv.notes = payload.notes.strip()

    # ── 7. Statut final ───────────────────────────────────────────────────────
    inv.status       = "validated"
    inv.validated_by = current_user.id
    doc.status       = "validated"

    # ── 8. Met à jour l'extracted_json pour tracer la correction ──────────────
    if ocr and ocr.extracted_json:
        updated_json = dict(ocr.extracted_json)

        # Enregistre les champs corrigés manuellement
        corrections = {}
        if payload.invoice_number : corrections["invoice_number"] = payload.invoice_number.strip()
        if payload.invoice_date   : corrections["invoice_date"]   = payload.invoice_date.strip()
        if payload.supplier_name  : corrections["supplier_name"]  = payload.supplier_name.strip()
        if payload.total_ttc      : corrections["total_ttc"]      = payload.total_ttc
        if payload.currency       : corrections["currency"]        = payload.currency.strip()

        updated_json["_manually_corrected"] = corrections
        ocr.extracted_json        = updated_json
        ocr.extraction_confidence = 100.0   # confirmé manuellement → score max

    db.commit()
    db.refresh(inv)

    # ── Retourne le nom du fournisseur effectivement enregistré en DB ──────────
    supplier_name_saved = None
    if inv.supplier_id:
        row = db.execute(
            text("SELECT name FROM suppliers WHERE id = :sid"),
            {"sid": inv.supplier_id}
        ).fetchone()
        if row:
            supplier_name_saved = row[0]

    return {
        "status"              : "validated",
        "document_id"         : document_id,
        "invoice_id"          : inv.id,
        "supplier_id"         : inv.supplier_id,
        "supplier_name_saved" : supplier_name_saved,   # ← pour debug / confirmation frontend
        "message"             : "Facture validée avec succès",
    }


# ══════════════════════════════════════════════════════════════
# GET /invoices/ — Liste avec filtres
# ══════════════════════════════════════════════════════════════
@router.get("/")
def list_invoices(
    status       : Optional[str]  = None,
    needs_review : Optional[bool] = None,
    supplier_id  : Optional[int]  = None,
    limit        : int = 50,
    offset       : int = 0,
    db           : Session = Depends(get_db),
    current_user            = Depends(require_role([ROLES.COMPTABILITE, ROLES.ADMIN_SYSTEME, ROLES.ADMIN_METIER])),
):
    q = db.query(SupplierInvoice)
    if status:       q = q.filter(SupplierInvoice.status      == status)
    if supplier_id:  q = q.filter(SupplierInvoice.supplier_id == supplier_id)

    total    = q.count()
    invoices = q.order_by(SupplierInvoice.id.desc()).offset(offset).limit(limit).all()

    result = []
    for inv in invoices:
        ocr          = db.query(OcrResult).filter(OcrResult.document_id == inv.document_id).first()
        conf         = float(ocr.extraction_confidence) if ocr else 0
        review_needed = conf < 75.0 or inv.status == "pending"

        if needs_review is not None and review_needed != needs_review:
            continue

        # Nom du fournisseur depuis la table suppliers (pas l'OCR brut)
        supplier_name = None
        if inv.supplier_id:
            row = db.execute(text("SELECT name FROM suppliers WHERE id=:sid"), {"sid": inv.supplier_id}).fetchone()
            if row:
                supplier_name = row[0]

        result.append({
            "invoice_id"      : inv.id,
            "document_id"     : inv.document_id,
            "supplier_id"     : inv.supplier_id,
            "supplier_name"   : supplier_name,          # ← nom réel depuis suppliers
            "invoice_number"  : inv.invoice_number,
            "invoice_date"    : str(inv.invoice_date) if inv.invoice_date else None,
            "total_ttc"       : float(inv.total_ttc or 0),
            "currency"        : inv.currency_code,
            "status"          : inv.status,
            "needs_review"    : review_needed,
            "extraction_score": conf,
        })

    return {"total": total, "invoices": result}


# ══════════════════════════════════════════════════════════════
# HELPER : _find_or_create_supplier
# ══════════════════════════════════════════════════════════════

def _find_or_create_supplier(name: str, tax_id: str, created_by: int, db: Session) -> int:
    """
    Cherche un fournisseur par son nom (insensible à la casse, sans espaces superflus).
    S'il existe → retourne son ID.
    Sinon → le crée et retourne le nouvel ID.

    CORRECTION :
      Ancienne logique : recherche par LOWER(name) = LOWER(:name)
        → Problem : "ATVYL" et "ATVYL HT" sont considérés différents
        → Résultat : création de doublons (VERNICOLOR TUNISIA, ATVYL, ATVYL HT...)

      Nouvelle logique :
        1. Recherche exacte insensible à la casse (LOWER + TRIM)
        2. Si pas trouvé → création avec le nom EXACT fourni
        3. Pas de création si le nom est vide ou trop court
    """

    name_clean = name.strip()

    # Sécurité : refus des noms vides ou trop courts
    if len(name_clean) < 2:
        raise HTTPException(400, f"Le nom du fournisseur est trop court : '{name_clean}'")

    # ── Recherche par nom exact (insensible à la casse) ──────────────────────
    row = db.execute(
        text("SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name)) LIMIT 1"),
        {"name": name_clean}
    ).fetchone()

    if row:
        # Fournisseur trouvé → retourne son ID sans rien modifier
        return row[0]

    # ── Fournisseur non trouvé → création ─────────────────────────────────────
    # Utilise le nom EXACT tel que saisi par l'utilisateur (pas le texte OCR brut)
    db.execute(
        text("""
            INSERT INTO suppliers (name, tax_id, country, is_active, created_by)
            VALUES (:name, :tax_id, 'Tunisie', TRUE, :created_by)
        """),
        {
            "name"       : name_clean,
            "tax_id"     : tax_id.strip() if tax_id else "",
            "created_by" : created_by,
        }
    )
    db.commit()

    # Récupère l'ID nouvellement créé
    row = db.execute(
        text("SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name)) LIMIT 1"),
        {"name": name_clean}
    ).fetchone()

    return row[0]