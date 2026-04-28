# app/services/regex_service.py
# ============================================================
# VERSION CORRIGÉE — Meria Pub + extraction coordonnées
# ============================================================

import re
import os
import io
import tempfile
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from dataclasses import dataclass, field


# ══════════════════════════════════════════════════════════════
# STRUCTURES DE DONNÉES
# ══════════════════════════════════════════════════════════════

@dataclass
class ExtractedField:
    value: Any
    confidence: float
    method: str
    raw_value: str = ""
    issues: List[str] = field(default_factory=list)

    @property
    def is_reliable(self) -> bool:
        return self.confidence >= 0.70

    def to_dict(self) -> dict:
        return {
            "value":      self.value,
            "confidence": round(self.confidence * 100, 1),
            "method":     self.method,
            "raw_value":  self.raw_value,
            "issues":     self.issues,
            "reliable":   self.is_reliable,
        }


@dataclass
class InvoiceExtractionResult:
    invoice_number: Optional[ExtractedField] = None
    invoice_date:   Optional[ExtractedField] = None
    supplier_name:  Optional[ExtractedField] = None
    total_ht:       Optional[ExtractedField] = None
    total_vat:      Optional[ExtractedField] = None
    total_ttc:      Optional[ExtractedField] = None
    currency:       Optional[ExtractedField] = None
    tax_id:         Optional[ExtractedField] = None
    email:          Optional[ExtractedField] = None
    phone:          Optional[ExtractedField] = None
    address:        Optional[ExtractedField] = None
    city:           Optional[ExtractedField] = None

    global_score: float = 0.0
    needs_review: bool  = True

    CRITICAL_FIELDS = ["invoice_number", "invoice_date", "supplier_name", "total_ttc"]

    def compute_score(self):
        weights = {
            "invoice_number": 0.25,
            "invoice_date":   0.25,
            "supplier_name":  0.20,
            "total_ttc":      0.20,
            "total_ht":       0.05,
            "total_vat":      0.03,
            "tax_id":         0.02,
        }
        score = 0.0
        for fname, w in weights.items():
            ef = getattr(self, fname, None)
            if ef and ef.value is not None:
                score += w * ef.confidence
        self.global_score = round(score * 100, 2)
        missing_critical = any(
            getattr(self, f) is None or getattr(self, f).value is None
            for f in self.CRITICAL_FIELDS
        )
        self.needs_review = self.global_score < 75.0 or missing_critical

    def to_flat_dict(self) -> dict:
        return {
            "invoice_number": self.invoice_number.value if self.invoice_number else None,
            "invoice_date":   self.invoice_date.value   if self.invoice_date   else None,
            "supplier_name":  self.supplier_name.value  if self.supplier_name  else None,
            "total_ht":       self.total_ht.value       if self.total_ht       else None,
            "total_vat":      self.total_vat.value      if self.total_vat      else 0.0,
            "total_ttc":      self.total_ttc.value      if self.total_ttc      else None,
            "currency":       self.currency.value       if self.currency       else "TND",
            "tax_id":         self.tax_id.value         if self.tax_id         else None,
            "email":          self.email.value          if self.email          else None,
            "phone":          self.phone.value          if self.phone          else None,
            "address":        self.address.value        if self.address        else None,
            "city":           self.city.value           if self.city           else None,
        }

    def to_detailed_dict(self) -> dict:
        fields_detail = {}
        for fname in ["invoice_number", "invoice_date", "supplier_name",
                       "total_ht", "total_vat", "total_ttc", "currency", "tax_id",
                       "email", "phone", "address", "city"]:
            ef = getattr(self, fname, None)
            fields_detail[fname] = ef.to_dict() if ef else {
                "value": None, "confidence": 0, "method": "not_found",
                "raw_value": "", "issues": ["Non détecté"], "reliable": False
            }
        return {
            "fields":       fields_detail,
            "global_score": self.global_score,
            "needs_review": self.needs_review,
        }

    def low_confidence_fields(self) -> list:
        result = []
        for fname in self.CRITICAL_FIELDS:
            ef = getattr(self, fname, None)
            if ef is None or ef.value is None:
                result.append({
                    "field": fname,
                    "confidence": 0,
                    "issue": "Non détecté — vérification manuelle requise"
                })
            elif not ef.is_reliable:
                result.append({
                    "field":      fname,
                    "confidence": round(ef.confidence * 100, 1),
                    "issue":      f"Faible confiance ({ef.method})"
                })
        return result


# ══════════════════════════════════════════════════════════════
# LECTURE PDF + IMAGE
# ══════════════════════════════════════════════════════════════

def read_pdf_text(file_bytes: bytes) -> str:
    try:
        import fitz
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:
            doc   = fitz.open(tmp_path)
            pages = [page.get_text() for page in doc]
            doc.close()
            text  = "\n".join(pages)
            if text.strip():
                return text
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    except ImportError:
        pass

    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = [p.extract_text() for p in pdf.pages if p.extract_text()]
            return "\n".join(pages)
    except ImportError:
        pass

    return ""


def extract_text_from_pdf_or_image(file_bytes, file_type, ocr_engine=None):
    if "pdf" in file_type.lower():
        text = read_pdf_text(file_bytes)
        if text.strip():
            return {
                "raw_text":   text,
                "lines":      [{"text": l, "confidence": 100.0}
                               for l in text.split('\n') if l.strip()],
                "confidence": 95.0,
                "status":     "success",
                "source":     "pdf_native"
            }
    return _ocr_paddleocr(file_bytes, ocr_engine)


def _ocr_paddleocr(file_bytes, ocr_engine=None):
    if ocr_engine is None:
        from paddleocr import PaddleOCR
        ocr_engine = PaddleOCR(use_angle_cls=False, lang='fr', show_log=False)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        result = ocr_engine.ocr(tmp_path, cls=False)
        if not result or not result[0]:
            return {"raw_text": "", "lines": [], "confidence": 0.0, "status": "failed"}

        lines, confidences = [], []
        for line in result[0]:
            text = line[1][0]
            conf = line[1][1]
            lines.append({"text": text, "confidence": round(conf * 100, 2), "bbox": line[0]})
            confidences.append(conf)

        raw_text = "\n".join(l["text"] for l in lines)
        avg_conf = round(sum(confidences) / len(confidences) * 100, 2) if confidences else 0.0

        return {
            "raw_text":   raw_text,
            "lines":      lines,
            "confidence": avg_conf,
            "status":     "success",
            "source":     "paddleocr"
        }
    except Exception as e:
        return {"raw_text": "", "lines": [], "confidence": 0.0,
                "status": "failed", "error": str(e)}
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ══════════════════════════════════════════════════════════════
# POINT D'ENTRÉE
# ══════════════════════════════════════════════════════════════

def extract_invoice_data(text: str) -> dict:
    """API rétro-compatible."""
    result = extract_invoice_data_with_scores(text)
    return result.to_flat_dict()


def extract_invoice_data_with_scores(text: str) -> InvoiceExtractionResult:
    result = InvoiceExtractionResult(
        invoice_number = _extract_invoice_number_scored(text),
        invoice_date   = _extract_date_scored(text),
        supplier_name  = _extract_supplier_scored(text),
        total_ht       = _extract_total_ht_scored(text),
        total_vat      = _extract_vat_scored(text),
        total_ttc      = _extract_total_ttc_scored(text),
        currency       = _extract_currency_scored(text),
        tax_id         = _extract_tax_id_scored(text),
        email          = _extract_email_scored(text),
        phone          = _extract_phone_scored(text),
        address        = _extract_address_scored(text),
        city           = _extract_city_scored(text),
    )
    result.compute_score()
    return result

def _extract_invoice_number_scored(text: str) -> Optional[ExtractedField]:
    """
    VERSION UNIVERSAL:
    - Support toutes structures (slash / dash / mix)
    - Fonctionne avec FACTURE ou INVOICE
    - Nettoyage OCR
    - Empêche valeur "FACTURE"
    - Fallback intelligent
    """

    PATTERNS = [

        # 🔥 UNIVERSAL (slash ou dash après FACTURE/INVOICE)
        (r'(?:FACTURE|INVOICE)[^\n]{0,50}?([A-Z0-9]{2,6}[\/\-][A-Z0-9\-]{2,})', 0.97, "universal_slash_dash"),

        # 🔥 UNIVERSAL GENERIC (mix lettres + chiffres)
        (r'(?:FACTURE|INVOICE)[^\n]{0,50}?([A-Z0-9][A-Z0-9\/\-]{5,})', 0.92, "universal_generic"),

        # 🔽 patterns originaux (نخليهم)
        (r'FACTURE\s+(?:EXPORT\s+)?N[°o\.]\s*(?:FC\s+)?(\d{4}[-]\d+)', 0.95, "facture_fc_annee"),
        (r'FACTURE\s*N[°o°]\s*[:\-]?\s*(\d{1,4}\s*[\/]\s*[A-Z0-9][A-Z0-9\-]+)', 0.95, "facture_n_slash_meria"),
        (r'FACTURE\s*N[°o\.]\s*[:\-]?\s*(\d+[\/\-][A-Z0-9\/\-]+)', 0.92, "facture_n_slash"),
        (r'FACTURE\s*N[°o\.][^\n]{0,10}(ER\d{6,})', 0.92, "facture_n_er"),
        (r'FACTURE\s*N[°o\.]\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-]{2,20})', 0.88, "facture_n_generic"),
        (r'Invoice\s+(?:No|Number|#)\s*[:.]?\s*([A-Z0-9][A-Z0-9\/\-]{2,20})', 0.88, "invoice_no_en"),

        # 🔥 fallback digits
        (r'FACTURE[^\n]{0,50}?(\d{5,})', 0.80, "facture_line_digits"),

        # Prefix fallback
        (r'\bFA(\d{2,}[\/\-]\d+)',   0.75, "fa_prefix_slash"),
        (r'\bFC\s*(\d{4}[-]\d{3,})', 0.75, "fc_prefix"),
        (r'\bER(\d{6,})',            0.70, "er_prefix"),
        (r'\bFA(\d{6,})',            0.65, "fa_prefix_plain"),
    ]

    EXCLUDE_CONTEXT = [
        r'N[°o\.]\s*(?:LTA|BL|NAVIRE|VOL|FLIGHT|HAWB|MAWB)',
        r'(?:PO|BON\s+DE\s+COMMANDE|ORDRE)\s*N[°o\.]',
        r'Ref(?:\.|\s)', r'Réf(?:\.|\s)',
    ]

    EXCLUDE_WORDS = {'LTA', 'REF', 'NAVIRE', 'VOL', 'FLIGHT', 'HAWB', 'MAWB'}

    for pattern, base_conf, method in PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE):

            raw = m.group(1).strip().split('\n')[0].strip()

            # 🔥 CLEAN OCR
            raw = raw.replace("O", "0").replace("I", "1")
            raw = re.sub(r'\s*/\s*', '/', raw)
            raw = re.sub(r'\s+', '', raw)

            # 🔴 منع كلمات عامة
            if raw.upper() in ["FACTURE", "INVOICE"]:
                continue

            before = text[max(0, m.start() - 40):m.start()]

            if any(re.search(exc, before, re.IGNORECASE) for exc in EXCLUDE_CONTEXT):
                continue

            if raw.upper() in EXCLUDE_WORDS:
                continue

            if len(raw) < 3 or not re.search(r'\d', raw):
                continue

            conf = base_conf

            if re.fullmatch(r'\d{4,}', raw):
                conf -= 0.10

            if len(raw) > 25:
                conf -= 0.05

            if re.search(r'[A-Z]{2,}', raw):
                conf += 0.03

            return ExtractedField(
                value=raw,
                confidence=min(conf, 0.99),
                method=method,
                raw_value=raw
            )

    # 🔥 FALLBACK UNIVERSAL
    candidates = re.findall(r'\b[A-Z0-9\/\-]{6,}\b', text)

    for c in candidates:
        c_clean = c.replace("O", "0").replace("I", "1")

        if (
            any(x in c_clean for x in ["/", "-", "202", "20"]) and
            not c_clean.isalpha()
        ):
            return ExtractedField(
                value=c_clean,
                confidence=0.60,
                method="fallback_universal",
                raw_value=c_clean,
                issues=["Fallback auto"]
            )

    return None

def _extract_date_scored(text: str) -> Optional[ExtractedField]:
    """
    FIX : PaddleOCR peut lire "Tunis le 24/04/2029" au lieu de "2025"
    → Vérification que l'année est plausible (2020–2027)
    → Si année hors plage → baisser confiance mais garder la valeur
    """
    EXCLUDE_LABELS = [
        'départ', 'depart', 'opération', 'operation',
        'impression', 'escale', 'arrivée', 'livraison',
        'expiration', 'due', 'échéance', 'echeance',
        'paiement', 'règlement', 'reglement', 'bon de commande',
        'po date', 'vol n', "date d'", 'début', 'fin de',
    ]

    DATE_RE = r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})'

    PASSES = [
        (r'Date\s+de\s+(?:la\s+)?facture\s*[:\-]?\s*' + DATE_RE,    0.97, "label_date_facture"),
        (r'Invoice\s+Date\s*[:\-]?\s*' + DATE_RE,                    0.97, "label_invoice_date_en"),
        (r'FACTURE\s+N[°o\.][^\n]{0,60}du\s*[:\-]?\s*' + DATE_RE,   0.95, "facture_n_du"),

        (r'Tunis\s*[,]?\s*le\s+' + DATE_RE,                          0.95, "tunis_le"),

        (r'(?:^|\n)\s*Le\s*[,]?\s*' + DATE_RE,                       0.88, "le_date_debut_ligne"),
        (r'(?:^|\n)\s*Date\s*[:\-]\s*' + DATE_RE,                    0.85, "date_label_isole"),

        # Fallback
        (DATE_RE,                                                      0.40, "premiere_date_fallback"),
    ]

    ANNEE_MIN = 2020
    ANNEE_MAX = datetime.now().year + 1

    for pattern, base_conf, method in PASSES:
        for m in re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE):
            raw = m.group(1).strip()

            before = text[max(0, m.start() - 80):m.start()].lower()
            if any(lbl in before for lbl in EXCLUDE_LABELS):
                continue

            normalized = _normalize_date(raw)
            if not normalized:
                continue

            issues = []
            conf = base_conf

            try:
                dt = datetime.strptime(normalized, "%Y-%m-%d")
                annee = dt.year

                # ← FIX CLEF : OCR lit parfois 2029 au lieu de 2025
                # Si l'année est hors plage raisonnable → corriger ou baisser
                if annee < ANNEE_MIN or annee > ANNEE_MAX:
                    issues.append(f"Année suspecte ({annee}) — probable erreur OCR")
                    conf -= 0.30  # grosse pénalité mais on garde la valeur

                if dt > datetime.now() and annee <= ANNEE_MAX:
                    issues.append("Date légèrement dans le futur")
                    conf -= 0.10

            except ValueError:
                pass

            return ExtractedField(
                value=normalized,
                confidence=max(conf, 0.10),
                method=method,
                raw_value=raw,
                issues=issues
            )

    return None


def _normalize_date(raw: str) -> Optional[str]:
    for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%Y-%m-%d', '%Y/%m/%d']:
        try:
            return datetime.strptime(raw.strip(), fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


# ══════════════════════════════════════════════════════════════
# FOURNISSEUR
# ══════════════════════════════════════════════════════════════

def _extract_supplier_scored(text: str) -> Optional[ExtractedField]:
    """
    VERSION ULTRA ROBUSTE :
    - ignore "Editée par"
    - priorise société réelle
    - fallback intelligent
    """

    IGNORE_PATTERNS = [
        r'editée\s+par',
        r'édite[eé]\s+par',
        r'imprimée\s+par',
        r'created\s+by',
    ]

    CLIENT_WORDS = [
        'client', 'destinataire', 'acheteur', 'customer', 'à:'
    ]

    SKIP_WORDS = [
        'FACTURE', 'INVOICE', 'DATE', 'TOTAL', 'TVA',
        'CODE', 'EMAIL', 'TEL', 'PHONE'
    ]

    # ───────────── 1. PRIORITÉ : SOCIÉTÉ AVEC FORME JURIDIQUE ─────────────
    match = re.search(
        r'([A-Z][A-Z\s]{3,}(?:SARL|SA|SAS|SUARL|SPA|LLC|LTD))',
        text,
        re.IGNORECASE
    )
    if match:
        name = match.group(1).strip()
        return ExtractedField(
            value=name,
            confidence=0.95,
            method="societe_forme_juridique",
            raw_value=name
        )

    # ───────────── 2. LIGNES DU HAUT ─────────────
    lines = text.split("\n")[:15]

    candidates = []

    for i, line in enumerate(lines):
        line_clean = line.strip()

        if len(line_clean) < 3:
            continue

        low = line_clean.lower()

        # ❌ ignorer "editée par"
        if any(re.search(p, low) for p in IGNORE_PATTERNS):
            continue

        if any(cw in low for cw in CLIENT_WORDS):
            continue

        if any(sw.lower() in low for sw in SKIP_WORDS):
            continue

        if re.match(r'^\d+', line_clean):
            continue

        if re.match(r'^[\+\d\s\-]+$', line_clean):
            continue

        score = 0.85 - (i * 0.05)

        # bonus majuscule
        if line_clean.isupper():
            score += 0.05

        candidates.append((line_clean, score))

    if candidates:
        best = max(candidates, key=lambda x: x[1])

        return ExtractedField(
            value=best[0],
            confidence=min(best[1], 0.92),
            method="ligne_haut_prioritaire",
            raw_value=best[0]
        )

    return None


# ══════════════════════════════════════════════════════════════
# EMAIL — NOUVEAU
# ══════════════════════════════════════════════════════════════

def _extract_email_scored(text: str) -> Optional[ExtractedField]:
    """
    Cherche une adresse email dans le texte.
    Exemple Meria Pub : faouzi_bensalah@yahoo.fr
    """
    # Pattern email standard
    m = re.search(
        r'[a-zA-Z0-9]([a-zA-Z0-9._\-]*[a-zA-Z0-9])?@[a-zA-Z0-9][a-zA-Z0-9\-]*\.[a-zA-Z]{2,}',
        text
    )
    if m:
        email = m.group(0).strip()
        # Vérification basique
        if '@' in email and '.' in email.split('@')[1]:
            return ExtractedField(
                value=email,
                confidence=0.95,
                method="email_regex",
                raw_value=email
            )
    return None


# ══════════════════════════════════════════════════════════════
# TÉLÉPHONE — NOUVEAU
# ══════════════════════════════════════════════════════════════

def _extract_phone_scored(text: str) -> Optional[ExtractedField]:
    """
    Cherche un numéro de téléphone tunisien.
    Exemple Meria Pub : 72 255 402 ou 98 296 443
    Format Tunisie : 8 chiffres, commence par 2,4,5,7,9
    """
    patterns = [
        # +216 XX XXX XXX ou +216XXXXXXXX
        (r'\+216\s?(\d{2}\s?\d{3}\s?\d{3})', 0.97, "avec_indicatif"),
        # Tél: XX XXX XXX (label explicite)
        (r'(?:Tél|Tel|Téléphone|Phone|Mob(?:ile)?)\s*[:\.]?\s*(\d{2}[\s\-]?\d{3}[\s\-]?\d{3})', 0.92, "avec_label"),
        # mobiles : XX XXX XXX - XX XXX XXX (plusieurs numéros)
        (r'mobiles?\s*[:\.]?\s*(\d{2}[\s\-]?\d{3}[\s\-]?\d{2,3})', 0.88, "label_mobile"),
        # Numéro seul 8 chiffres tunisien
        (r'\b([2-9]\d{7})\b', 0.70, "numero_seul_8chiffres"),
    ]

    for pattern, conf, method in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            phone = re.sub(r'\s+', ' ', m.group(1).strip())
            if len(re.sub(r'\D', '', phone)) >= 8:
                return ExtractedField(
                    value=phone,
                    confidence=conf,
                    method=method,
                    raw_value=phone
                )
    return None


# ══════════════════════════════════════════════════════════════
# ADRESSE — NOUVEAU
# ══════════════════════════════════════════════════════════════

def _extract_address_scored(text: str) -> Optional[ExtractedField]:
    """
    Cherche une adresse physique.
    Exemple Meria Pub : Avenue 9 Avril - Grombalia
    """
    patterns = [
        # Label explicite
        (r'(?:Adresse|Address)\s*[:\-]?\s*(.{10,80})',          0.90, "label_adresse"),
        # Avenue / Rue / Route / Boulevard
        (r'((?:Avenue|Rue|Route|Bd|Boulevard|Impasse)\s+.{5,60})',0.85, "avenue_rue"),
        # Zone industrielle / Cité
        (r'((?:Zone\s+industrielle|Cité|ZI)\s+.{5,50})',         0.80, "zone_cite"),
    ]

    for pattern, conf, method in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            addr = m.group(1).strip().split('\n')[0].strip()
            # Nettoyer
            addr = re.sub(r'\s+', ' ', addr)
            if len(addr) >= 8:
                return ExtractedField(
                    value=addr[:200],
                    confidence=conf,
                    method=method,
                    raw_value=addr
                )
    return None


# ══════════════════════════════════════════════════════════════
# VILLE — NOUVEAU
# ══════════════════════════════════════════════════════════════

def _extract_city_scored(text: str) -> Optional[ExtractedField]:
    """
    Cherche la ville du fournisseur.
    Exemple Meria Pub : Grombalia
    """
    # Villes tunisiennes courantes
    VILLES_TUNISIE = [
        'Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Gabès', 'Ariana',
        'Gafsa', 'Monastir', 'Ben Arous', 'Nabeul', 'Grombalia',
        'La Marsa', 'Hammamet', 'Manouba', 'Béja', 'Jendouba',
        'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Tozeur', 'Médenine',
        'Tataouine', 'Kébili', 'Siliana', 'Zaghouan', 'Mahdia',
    ]

    # Cherche d'abord "Ville: XXX"
    m = re.search(r'Ville\s*[:\-]?\s*(\w[\w\s]{2,30})', text, re.IGNORECASE)
    if m:
        ville = m.group(1).strip().split('\n')[0].strip()
        return ExtractedField(value=ville, confidence=0.90, method="label_ville", raw_value=ville)

    # Cherche dans la liste des villes connues
    for ville in VILLES_TUNISIE:
        if re.search(r'\b' + re.escape(ville) + r'\b', text, re.IGNORECASE):
            return ExtractedField(value=ville, confidence=0.80, method="ville_connue", raw_value=ville)

    # Code postal + ville (ex: 8030 Grombalia)
    m = re.search(r'\b(\d{4})\s+([A-ZÀ-Ü][a-zà-ü]{2,20})\b', text)
    if m:
        ville = m.group(2).strip()
        return ExtractedField(value=ville, confidence=0.75, method="code_postal_ville", raw_value=ville)

    return None


# ══════════════════════════════════════════════════════════════
# MONTANTS
# ══════════════════════════════════════════════════════════════
def clean_text(text):
    text = text.upper()

    text = text.replace("T0TAL", "TOTAL")
    text = text.replace("TVA.", "TVA")
    text = text.replace("TTC.", "TTC")
    text = text.replace("HT.", "HT")
    text = text.replace("H.T", "HT")
    text = text.replace("T.T.C", "TTC")
    text = text.replace("TV.A", "TVA")

    return text
def _extract_total_ht_scored(text):
    patterns = [
        (r'(?:TOTAL|Total)\s*HT\s*[:\-]?\s*([\d\s,\.]+)', 0.95, "total_ht"),

        # 🔥 جديد (مهم)
        (r'HT\s*[:\-]?\s*([\d\s,\.]+)', 0.90, "ht_simple"),
        (r'MONTANT\s*HT\s*[:\-]?\s*([\d\s,\.]+)', 0.92, "montant_ht"),

        (r'Net\s*HT\s*[:\-]?\s*([\d\s,\.]+)', 0.88, "net_ht"),
        (r'\bHT\b[^\d]{0,15}([\d\s,\.]+)', 0.80, "ht_flexible"),
    ]

    return _parse_amount_scored(text, patterns)


def _extract_vat_scored(text):
    patterns = [
        (r'Montant\s+TVA\s*[:\-]?\s*([\d,\.]+)',     0.92, "montant_tva"),
        (r'Total\s+TVA\s*[:\-]?\s*([\d,\.]+)',        0.90, "total_tva"),
        (r'TVA\s*[:\-]\s*([\d,\.]+)',                 0.85, "tva_label"),
        (r'TVA\s+\d+\s*%\s+([\d,\.]+)',               0.80, "tva_avec_taux"),
        (r'VAT\s+Amount\s*[:\-]?\s*([\d,\.]+)',       0.88, "vat_amount_en"),
    ]
    result = _parse_amount_scored(text, patterns)
    if result is None:
        return ExtractedField(value=0.0, confidence=0.50, method="default_zero")
    return result


def _extract_total_ttc_scored(text):
    patterns = [
        (r'(?:TOTAL|Total)[^\n]{0,20}TTC\s*[:\-]?\s*([\d\s,\.]+)', 0.97, "total_ttc"),

        # 🔥 جديد
        (r'TTC\s*[:\-]?\s*([\d\s,\.]+)', 0.92, "ttc_simple"),
        (r'MONTANT\s*TTC\s*[:\-]?\s*([\d\s,\.]+)', 0.93, "montant_ttc"),

        (r'Net\s*[àa]\s*payer\s*[:\-]?\s*([\d\s,\.]+)', 0.95, "net_a_payer"),

        (r'TTC[^\d]{0,15}([\d\s,\.]+)', 0.85, "ttc_flexible"),
    ]

    return _parse_amount_scored(text, patterns)
def compute_totals(ht, tva, ttc):

    ht_val  = ht.value  if ht  else None
    tva_val = tva.value if tva else None
    ttc_val = ttc.value if ttc else None

    # 🔥 إذا TTC ناقص
    if ttc_val is None and ht_val is not None:
        if tva_val is not None:
            ttc_val = ht_val + tva_val
        else:
            ttc_val = ht_val

    # 🔥 إذا HT ناقص
    if ht_val is None and ttc_val is not None and tva_val is not None:
        ht_val = ttc_val - tva_val

    # 🔥 إذا TVA ناقص
    if tva_val is None and ht_val is not None and ttc_val is not None:
        tva_val = ttc_val - ht_val

    return ht_val, tva_val, ttc_val

def _extract_currency_scored(text):
    currency_map = {'DT': 'TND', 'DINARS': 'TND', 'DINAR': 'TND',
                    '€': 'EUR', '$': 'USD', '£': 'GBP'}
    m = re.search(r'\b(TND|EUR|USD|GBP|CHF|DT)\b', text, re.IGNORECASE)
    if m:
        found = m.group(1).upper()
        return ExtractedField(value=currency_map.get(found, found), confidence=0.95, method="iso_code")
    if '€' in text:
        return ExtractedField(value='EUR', confidence=0.92, method="symbol_euro")
    if '$' in text:
        return ExtractedField(value='USD', confidence=0.90, method="symbol_dollar")
    if re.search(r'\(DT\)|Dinars?', text, re.IGNORECASE):
        return ExtractedField(value='TND', confidence=0.88, method="dinar_keyword")
    return ExtractedField(value='TND', confidence=0.60, method="default_tnd",
                          issues=["Devise non détectée — TND par défaut"])


def _extract_tax_id_scored(text):
    patterns = [
        (r'Matricule\s+[Ff]iscal\s*[:\-]?\s*([0-9A-Z\s\/]+)', 0.95, "matricule_fiscal"),
        (r'\bM\.?F\.?\s*[:\-]?\s*([0-9A-Z\/\.]+)',             0.88, "mf_abrege"),
        (r'VAT\s+(?:No|Number)\s*[:\-]?\s*([A-Z0-9]+)',        0.88, "vat_number_en"),
        (r'C\.?D\.?\s*[:\-]?\s*([0-9A-Z\/\.]+)',               0.70, "cd_abrege"),
    ]
    for pattern, conf, method in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            raw = m.group(1).strip().split('\n')[0].strip()
            if len(raw) >= 5:
                return ExtractedField(value=raw[:60], confidence=conf, method=method, raw_value=raw)
    return None


# ══════════════════════════════════════════════════════════════
# HELPER montants
# ══════════════════════════════════════════════════════════════

def _parse_amount_scored(text, patterns):
    for pattern, base_conf, method in patterns:
        m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if m:
            raw     = m.group(1).strip()
            cleaned = re.sub(r'[^\d,\.]', '', raw)
            if not cleaned:
                continue
            if ',' in cleaned and '.' in cleaned:
                if cleaned.index(',') > cleaned.index('.'):
                    cleaned = cleaned.replace('.', '').replace(',', '.')
                else:
                    cleaned = cleaned.replace(',', '')
            elif ',' in cleaned:
                cleaned = cleaned.replace(',', '.')
            try:
                val = float(cleaned)
                if val <= 0:
                    continue
                issues = []
                conf   = base_conf
                if val > 1_000_000:
                    issues.append(f"Montant très élevé : {val}")
                    conf -= 0.10
                return ExtractedField(
                    value=round(val, 3), confidence=max(conf, 0.10),
                    method=method, raw_value=raw, issues=issues
                )
            except ValueError:
                continue
    return None