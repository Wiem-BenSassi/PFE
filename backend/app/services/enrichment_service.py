# app/services/enrichment_service.py
import re
from typing import Optional
from app.services.currency_detector import get_exchange_rate

def compute_total_tnd(total_amount: float, currency: str) -> float:
    return round(total_amount * get_exchange_rate(currency), 3)

def extract_tax_amount(fields: dict, raw_text: str) -> float:
    existing = fields.get("tax_amount")
    if existing:
        try:
            v = float(str(existing).replace(",","."))
            if v > 0: return round(v, 3)
        except: pass

    patterns = [
        r'(?:Montant\s+)?TVA\s+\d+[,\.]?\d*\s*%\s*[:\-]?\s*([\d,\.]+)',
        r'Montant\s+TVA\s*[:\-]?\s*([\d,\.]+)',
        r'(?:Food\s+Sales\s+Tax|Beverage\s+Sales\s+Tax|Sales\s+Tax)\s*[:\$]?\s*([\d,\.]+)',
        r'(?:Wellness\s+Surcharge|Surcharge)\s*[:\$]?\s*([\d,\.]+)',
        r'IMP\.?\s*IVA\s+([\d,\.]+)',
        r'TOPKDV\s*\*?\s*([\d,\.]+)',
        r'KDV\s*[:\-]?\s*\*?\s*([\d,\.]+)',
        r'CGST\s*@?\s*[\d\.]+\s*%?\s*[:\-]?\s*([\d,\.]+)',
        r'SGST\s*@?\s*[\d\.]+\s*%?\s*[:\-]?\s*([\d,\.]+)',
        r'\bVAT\b\s*[:\-]?\s*([\d,\.]+)',
        r'T\.V\.A\s*[:\-]?\s*([\d,\.]+)',
        r'Tax\s*[:\-]?\s*\$?([\d,\.]+)',
    ]
    total_tax = 0.0
    for p in patterns:
        for m in re.finditer(p, raw_text, re.IGNORECASE):
            try:
                v = float(m.group(1).replace(",",".").strip())
                if 0.01 < v < 100_000:
                    total_tax += v
            except: pass
    return round(total_tax, 3) if total_tax > 0 else 0.0

def extract_tip_amount(fields: dict, raw_text: str) -> float:
    existing = fields.get("tip_amount")
    if existing:
        try:
            v = float(str(existing).replace(",","."))
            if v > 0: return round(v, 3)
        except: pass
    total = float(fields.get("total_amount") or 0) or 1.0
    for p in [
        r'(?:Tip|Gratuity|Pourboire)\s*[:\$£€]?\s*([\d,\.]+)',
        r'Service\s+Charge\s*[:\$£€]?\s*([\d,\.]+)',
    ]:
        m = re.search(p, raw_text, re.IGNORECASE)
        if m:
            try:
                v = float(m.group(1).replace(",","."))
                if 0 < v < total * 0.40: return round(v, 3)
            except: pass
    return 0.0

def enrich_fields(fields: dict, raw_text: str, currency: Optional[str] = None) -> dict:
    curr      = (currency or fields.get("currency") or "TND").upper()
    total     = float(fields.get("total_amount") or 0)
    fields["exchange_rate_to_tnd"] = get_exchange_rate(curr)
    fields["total_amount_tnd"]     = compute_total_tnd(total, curr)
    fields["tax_amount"]           = extract_tax_amount(fields, raw_text)
    fields["tip_amount"]           = extract_tip_amount(fields, raw_text)
    return fields
