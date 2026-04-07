# app/services/receipt_extraction_service.py
# ============================================================
# VERSION MULTILINGUE : FR + EN + TR + AR
# Reçus : taxi, restaurant, supermarché, carburant, hôtel
# ============================================================

import re
import json
from typing      import Optional, List, Any
from datetime    import datetime, date
from dataclasses import dataclass, field


# ══════════════════════════════════════════════════════════════
# STRUCTURES DE DONNÉES
# ══════════════════════════════════════════════════════════════

@dataclass
class ReceiptField:
    value:      Any
    confidence: float
    method:     str
    raw_value:  str = ""
    issues:     List[str] = field(default_factory=list)

    @property
    def is_reliable(self) -> bool:
        return self.confidence >= 0.65

    def to_dict(self) -> dict:
        return {
            "value":      self.value,
            "confidence": round(self.confidence * 100, 1),
            "method":     self.method,
            "raw_value":  self.raw_value,
            "reliable":   self.is_reliable,
        }


@dataclass
class ReceiptExtractionResult:
    merchant_name:    Optional[ReceiptField] = None
    receipt_date:     Optional[ReceiptField] = None
    receipt_date_obj: Optional[date]         = None
    receipt_time:     Optional[ReceiptField] = None
    total_amount:     Optional[ReceiptField] = None
    tax_amount:       Optional[ReceiptField] = None
    currency:         Optional[ReceiptField] = None
    payment_method:   Optional[ReceiptField] = None
    category_code:    Optional[ReceiptField] = None

    global_score: float = 0.0
    needs_review: bool  = True

    CRITICAL_FIELDS = ["merchant_name", "receipt_date",
                       "total_amount",  "category_code"]

    def compute_score(self):
        weights = {
            "merchant_name" : 0.25,
            "receipt_date"  : 0.20,
            "total_amount"  : 0.35,
            "category_code" : 0.10,
            "tax_amount"    : 0.05,
            "payment_method": 0.05,
        }
        score = 0.0
        for fname, w in weights.items():
            ef = getattr(self, fname, None)
            if ef and ef.value is not None:
                score += w * ef.confidence
        self.global_score = round(score * 100, 2)

        if self.receipt_date and self.receipt_date.value:
            self.receipt_date_obj = _parse_date_to_obj(self.receipt_date.value)

        missing = any(
            getattr(self, f) is None or getattr(self, f).value is None
            for f in self.CRITICAL_FIELDS
        )
        self.needs_review = self.global_score < 60.0 or missing

    def to_flat_dict(self) -> dict:
        return {
            "merchant_name" : self.merchant_name.value  if self.merchant_name  else None,
            "receipt_date"  : self.receipt_date.value   if self.receipt_date   else None,
            "receipt_time"  : self.receipt_time.value   if self.receipt_time   else None,
            "total_amount"  : self.total_amount.value   if self.total_amount   else None,
            "tax_amount"    : self.tax_amount.value     if self.tax_amount     else 0.0,
            "currency"      : self.currency.value       if self.currency       else "TND",
            "payment_method": self.payment_method.value if self.payment_method else None,
            "category_code" : self.category_code.value  if self.category_code  else "other",
        }

    def low_confidence_fields(self) -> list:
        result = []
        for fname in self.CRITICAL_FIELDS:
            ef = getattr(self, fname, None)
            if ef is None or ef.value is None:
                result.append({
                    "field":      fname,
                    "confidence": 0,
                    "issue":      "Non détecté — vérification manuelle"
                })
            elif not ef.is_reliable:
                result.append({
                    "field":      fname,
                    "confidence": round(ef.confidence * 100, 1),
                    "issue":      f"Confiance faible ({ef.method})"
                })
        return result


# ══════════════════════════════════════════════════════════════
# POINT D'ENTRÉE
# ══════════════════════════════════════════════════════════════

def extract_receipt_data(text: str) -> dict:
    return extract_receipt_data_with_scores(text).to_flat_dict()


def extract_receipt_data_with_scores(text: str) -> ReceiptExtractionResult:
    clean = clean_receipt_text(text)
    result = ReceiptExtractionResult(
        merchant_name  = _extract_merchant(clean),
        receipt_date   = _extract_date(clean),
        receipt_time   = _extract_time(clean),
        total_amount   = _extract_total(clean),
        tax_amount     = _extract_tax(clean),
        currency       = _extract_currency(clean),
        payment_method = _extract_payment(clean),
        category_code  = _detect_category(clean),
    )
    result.compute_score()
    return result


# ══════════════════════════════════════════════════════════════
# NETTOYAGE
# ══════════════════════════════════════════════════════════════

def clean_receipt_text(raw: str) -> str:
    if not raw:
        return ""
    text = raw
    text = re.sub(r' {2,}', ' ', text)
    text = '\n'.join(line.strip() for line in text.split('\n'))
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Corriger O→0, l→1 dans les montants
    text = re.sub(r'(?<=\d)O(?=\d)', '0', text)
    text = re.sub(r'(?<=\d)l(?=\d)', '1', text)
    # Normaliser décimaux
    text = re.sub(r'(\d)\s*,\s*(\d)', r'\1,\2', text)
    text = re.sub(r'(\d)\s*\.\s*(\d)', r'\1.\2', text)
    return text.strip()


# ══════════════════════════════════════════════════════════════
# COMMERÇANTS CONNUS
# ══════════════════════════════════════════════════════════════

KNOWN_MERCHANTS = {
    r'\bUber\b'          : ('Uber',          0.99, 'taxi'),
    r'\bBolt\b'          : ('Bolt',          0.99, 'taxi'),
    r'\bCareem\b'        : ('Careem',        0.99, 'taxi'),
    r'\bTaxi\s+Bruxell'  : ('Taxi Bruxellois',0.97,'taxi'),
    r'\bTotalEnergies\b' : ('TotalEnergies', 0.99, 'fuel'),
    r'\bSTAR\b'          : ('STAR',          0.95, 'fuel'),
    r'\bAGIL\b'          : ('AGIL',          0.95, 'fuel'),
    r'\bCarrefour\b'     : ('Carrefour',     0.99, 'supermarket'),
    r'\bMonoprix\b'      : ('Monoprix',      0.99, 'supermarket'),
    r'\bAziza\b'         : ('Aziza',         0.98, 'supermarket'),
    r'\bStarbucks\b'     : ('Starbucks',     0.99, 'cafe'),
    r"McDonald'?s"       : ("McDonald's",    0.99, 'restaurant'),
    r'\bKFC\b'           : ('KFC',           0.99, 'restaurant'),
    r'\bPizza\s*Hut\b'   : ('Pizza Hut',     0.99, 'restaurant'),
    r'\bNovotel\b'       : ('Novotel',       0.99, 'hotel'),
    r'\bIbis\b'          : ('Ibis',          0.99, 'hotel'),
    r'\bHilton\b'        : ('Hilton',        0.99, 'hotel'),
}

SKIP_MERCHANT = [
    'ticket', 'reçu', 'receipt', 'facture', 'caisse',
    'date', 'heure', 'total', 'tva', 'merci', 'bienvenue',
    'tél', 'adresse', 'code', 'ref', 'n°', 'tarif',
    'montant', 'payer', 'amount', 'sale', 'tax',
    # Turc
    'tarih', 'saat', 'toplam', 'nakit',
]


def _extract_merchant(text: str) -> Optional[ReceiptField]:
    # 1. Commerçants connus
    for pattern, (name, conf, _) in KNOWN_MERCHANTS.items():
        if re.search(pattern, text, re.IGNORECASE):
            return ReceiptField(value=name, confidence=conf,
                                method="known_merchant", raw_value=name)

    # 2. Label explicite
    for p in [
        r'(?:Commerçant|Enseigne|Merchant|Marchand)\s*[:\-]\s*(.+)',
        r'(?:Restaurant|Café|Hotel|Station|Fast\s+Food)\s+(.{3,50})',
    ]:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            name = m.group(1).strip().split('\n')[0].strip()
            if len(name) >= 2:
                return ReceiptField(
                    value=_norm_name(name), confidence=0.85,
                    method="label", raw_value=name
                )

    # 3. Première ligne significative
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    for i, line in enumerate(lines[:8]):
        if len(line) < 2: continue
        if any(sw in line.lower() for sw in SKIP_MERCHANT): continue
        if re.match(r'^[\d\s\+\-\(\)\/\.\*]+$', line): continue
        if re.match(r'^\d', line): continue

        score = max(0.45, 0.72 - i * 0.05)
        if re.search(r'\b(?:SARL|SA|Restaurant|Café|Hotel|Bar|Taxi)\b',
                     line, re.IGNORECASE):
            score = min(score + 0.15, 0.88)

        return ReceiptField(
            value=_norm_name(line), confidence=score,
            method="premiere_ligne", raw_value=line,
            issues=[] if score >= 0.65 else ["Nom incertain"]
        )
    return None


def _norm_name(name: str) -> str:
    name = ' '.join(name.split()).title().rstrip('.,;:')
    return name[:100]


# ══════════════════════════════════════════════════════════════
# DATE — MULTILINGUE
# FR: Date: / le  |  EN: Date:  |  TR: TARIH  |  AR: التاريخ
# ══════════════════════════════════════════════════════════════

DATE_FMT = [
    '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y',
    '%Y-%m-%d', '%Y/%m/%d',
    '%d/%m/%y', '%m/%d/%Y',   # format US (ex: 3/28/2023)
    '%m/%d/%y',
]


def _norm_date(raw: str) -> Optional[str]:
    raw = raw.strip()
    for fmt in DATE_FMT:
        try:
            return datetime.strptime(raw, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


def _parse_date_to_obj(date_str: str) -> Optional[date]:
    for fmt in DATE_FMT + ['%Y-%m-%d']:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _extract_date(text: str) -> Optional[ReceiptField]:
    """
    Multilingue :
    FR  : Date: / le / du
    EN  : Date:
    TR  : TARIH :
    AR  : التاريخ
    """
    DATE_RE = r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})'

    PASSES = [
        # Français
        (r'Date\s*[:\-]\s*' + DATE_RE,                0.95, "label_date_fr"),
        (r'\ble\s+' + DATE_RE,                         0.90, "le_date"),
        # Anglais — aussi format MM/DD/YYYY
        (r'Date\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})', 0.95, "label_date_en"),
        # Turc : TARIH
        (r'TARIH\s*[:\-]?\s*' + DATE_RE,              0.95, "label_tarih_tr"),
        # Turc : aussi "Tarih :"
        (r'Tarih\s*[:\-]?\s*' + DATE_RE,              0.92, "tarih_tr"),
        # Date + heure sur même ligne
        (r'(' + DATE_RE[1:-1] + r')\s+\d{1,2}:\d{2}', 0.88, "date_heure"),
        # Fallback
        (DATE_RE,                                       0.45, "fallback"),
    ]

    ANNEE_MIN = 2018
    ANNEE_MAX = datetime.now().year + 1

    for pattern, base_conf, method in PASSES:
        m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if m:
            raw = m.group(1).strip()
            normalized = _norm_date(raw)
            if not normalized:
                continue

            issues = []
            conf   = base_conf
            try:
                dt = datetime.strptime(normalized, "%Y-%m-%d")
                if dt.year < ANNEE_MIN or dt.year > ANNEE_MAX:
                    issues.append(f"Année suspecte ({dt.year})")
                    conf -= 0.25
            except ValueError:
                pass

            return ReceiptField(
                value=normalized, confidence=max(conf, 0.10),
                method=method, raw_value=raw, issues=issues
            )
    return None


# ══════════════════════════════════════════════════════════════
# HEURE
# ══════════════════════════════════════════════════════════════

def _extract_time(text: str) -> Optional[ReceiptField]:
    patterns = [
        # FR/EN label
        (r'(?:Heure|Time|Heure\s+Arrivée|Heure\s+Début)\s*[:\-]?\s*(\d{1,2}:\d{2}(?::\d{2})?)', 0.95, "label_heure"),
        # Turc : SAAT
        (r'SAAT\s*[:\-]?\s*(\d{1,2}:\d{2}(?::\d{2})?)',  0.95, "saat_tr"),
        # Après la date
        (r'\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\s+(\d{1,2}:\d{2}(?::\d{2})?)', 0.88, "apres_date"),
        # Format hh:mm AM/PM
        (r'\b(\d{1,2}:\d{2}\s*(?:AM|PM))\b', 0.85, "ampm"),
        # Format hhmm seul
        (r'\b(\d{2}:\d{2}:\d{2})\b', 0.70, "hhmmss"),
        (r'\b(\d{2}:\d{2})\b',        0.60, "hhmm"),
    ]
    for pattern, conf, method in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            t = m.group(1).strip()
            return ReceiptField(value=t, confidence=conf,
                                method=method, raw_value=t)
    return None


# ══════════════════════════════════════════════════════════════
# MONTANT TOTAL — MULTILINGUE + SCORING
# ══════════════════════════════════════════════════════════════

def _extract_total(text: str) -> Optional[ReceiptField]:
    """
    Labels supportés :
    FR  : Net à Payer / Total TTC / Montant à Payer / Total
    EN  : Total / Balance Due / Amount Due / Grand Total
    TR  : TOPLAM / NAKİT
    """
    AMT = r'([\*\s]?[\d\s,\.]+)'   # accepte * avant le montant (turc)

    PATTERNS = [
        # Français — priorité max
        (r'MONTANT\s+A\s+PAYER\s*' + AMT,              0.98, "montant_a_payer_fr"),
        (r'Net\s+[àa]\s+[Pp]ayer\s*[:\-]?\s*' + AMT,  0.98, "net_a_payer_fr"),
        (r'NET\s+A\s+PAYER\s*[:\-]?\s*' + AMT,         0.98, "net_a_payer_maj"),
        (r'TOTAL\s+TTC\s*[:\-]?\s*' + AMT,             0.95, "total_ttc"),
        (r'Total\s+TTC\s*[:\-]?\s*' + AMT,             0.95, "total_ttc_fr"),
        (r'MONTANT\s*[:\-]?\s*' + AMT,                 0.88, "montant_fr"),

        # Anglais
        (r'Balance\s+Due\s*[:\-]?\s*' + AMT,           0.97, "balance_due_en"),
        (r'Amount\s+Due\s*[:\-]?\s*' + AMT,            0.95, "amount_due_en"),
        (r'Grand\s+Total\s*[:\-]?\s*' + AMT,           0.93, "grand_total_en"),
        (r'Total\s+Due\s*[:\-]?\s*' + AMT,             0.92, "total_due_en"),
        (r'(?:^|\n)\s*Total\s*[:\-]?\s*' + AMT,        0.88, "total_en"),

        # Turc
        (r'TOPLAM\s*' + AMT,                            0.95, "toplam_tr"),
        (r'NAKİT\s*' + AMT,                             0.90, "nakit_tr"),

        # Taxi spécifique
        (r'(?:Fare|Course|Tarif)\s*(?:\d)?\s*[:\-]?\s*' + AMT, 0.88, "fare_taxi"),
    ]

    candidates = []
    for pattern, base_conf, method in PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if m:
            raw = m.group(1)
            val = _parse_amount(raw)
            if val and val > 0:
                candidates.append((val, base_conf, method, raw))

    if not candidates:
        # Fallback : plus grand montant du texte
        all_amounts = _find_all_amounts(text)
        if all_amounts:
            max_val = max(all_amounts)
            return ReceiptField(
                value=max_val, confidence=0.30,
                method="fallback_max",
                issues=["Montant déduit — vérifier"]
            )
        return None

    best = max(candidates, key=lambda x: x[1])
    val, conf, method, raw = best
    issues = []
    if val > 50000:
        issues.append(f"Montant très élevé : {val}")
        conf -= 0.10

    return ReceiptField(
        value=val, confidence=max(conf, 0.10),
        method=method, raw_value=raw.strip(), issues=issues
    )


def _find_all_amounts(text: str) -> List[float]:
    result = []
    for m in re.finditer(r'\b(\d{1,6}[,\.]\d{2,3})\b', text):
        val = _parse_amount(m.group(1))
        if val and 0.1 < val < 1_000_000:
            result.append(val)
    return result


# ══════════════════════════════════════════════════════════════
# TVA
# ══════════════════════════════════════════════════════════════

def _extract_tax(text: str) -> Optional[ReceiptField]:
    patterns = [
        # ✅ montant APRÈS "TVA 19%" pas le taux
        (r'TVA\s+\d+\s*%\s+([\d,\.]+)',              0.88, "tva_apres_taux"),
        (r'Montant\s+TVA\s*[:\-]?\s*([\d,\.]+)',      0.92, "montant_tva"),
        (r'Sales\s+Tax\s*[:\-]?\s*\$?([\d,\.]+)',     0.92, "sales_tax_en"),
        # Turc : TOPKDV (total TVA)
        (r'TOPKDV\s*\*?([\d,\.]+)',                   0.90, "topkdv_tr"),
        (r'KDV\s*[:\-]?\s*\*?([\d,\.]+)',             0.85, "kdv_tr"),
        # Indien : CGST / SGST
        (r'CGST\s*@?\s*[\d\.]+\s*%?\s*[:\-]?\s*([\d,\.]+)', 0.85, "cgst_in"),
        (r'SGST\s*@?\s*[\d\.]+\s*%?\s*[:\-]?\s*([\d,\.]+)', 0.85, "sgst_in"),
        (r'TVA\s*[:\-]\s*([\d,\.]+)',                 0.82, "tva_label"),
        (r'Tax\s*[:\-]?\s*([\d,\.]+)',                0.78, "tax_en"),
    ]
    for pattern, conf, method in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            val = _parse_amount(m.group(1))
            if val is not None:
                return ReceiptField(
                    value=val, confidence=conf,
                    method=method, raw_value=m.group(1).strip()
                )
    return None


# ══════════════════════════════════════════════════════════════
# DEVISE — MULTILINGUE
# ══════════════════════════════════════════════════════════════

def _extract_currency(text: str) -> ReceiptField:
    """
    Détecte la devise depuis symboles et codes ISO.
    Support : TND, EUR (€), USD ($), GBP (£), INR, TRY
    """
    CURRENCY_MAP = {
        'DT': 'TND', 'DINARS': 'TND', 'DINAR': 'TND',
        '€':  'EUR',  '$': 'USD',   '£': 'GBP',
        '₺': 'TRY',   '₹': 'INR',
    }

    # Codes ISO
    m = re.search(
        r'\b(TND|EUR|USD|GBP|CHF|DT|TRY|INR)\b',
        text, re.IGNORECASE
    )
    if m:
        found = m.group(1).upper()
        return ReceiptField(
            value=CURRENCY_MAP.get(found, found),
            confidence=0.95, method="iso_code"
        )

    # Symboles
    if '€' in text:
        return ReceiptField(value='EUR', confidence=0.95, method="euro_symbol")
    if '₺' in text:
        return ReceiptField(value='TRY', confidence=0.95, method="lira_symbol")
    if '₹' in text:
        return ReceiptField(value='INR', confidence=0.95, method="rupee_symbol")
    if '$' in text:
        return ReceiptField(value='USD', confidence=0.92, method="dollar_symbol")
    if '£' in text:
        return ReceiptField(value='GBP', confidence=0.92, method="pound_symbol")

    # Mots-clés
    if re.search(r'\(DT\)|Dinars?', text, re.IGNORECASE):
        return ReceiptField(value='TND', confidence=0.88, method="dinar_keyword")

    # Heuristiques devise par langue/pays
    if re.search(r'\bTOPLAM\b|\bNAKİT\b|\bKDV\b', text, re.IGNORECASE):
        return ReceiptField(value='TRY', confidence=0.75, method="turc_keywords")
    if re.search(r'\bSub\s+Total\b|\bSales\s+Tax\b', text, re.IGNORECASE):
        return ReceiptField(value='USD', confidence=0.70, method="us_keywords")
    if re.search(r'\bMONTANT\s+A\s+PAYER\b|\bHeure\s+Arrivée\b', text, re.IGNORECASE):
        return ReceiptField(value='EUR', confidence=0.75, method="fr_be_keywords")

    return ReceiptField(
        value='TND', confidence=0.50, method="default_tnd",
        issues=["Devise non détectée — TND par défaut"]
    )


# ══════════════════════════════════════════════════════════════
# MODE DE PAIEMENT
# ══════════════════════════════════════════════════════════════

def _extract_payment(text: str) -> Optional[ReceiptField]:
    patterns = [
        (r'\b(?:CARTE|CARD|CB|VISA|MASTERCARD|AMEX)\b', 'card',    0.95),
        (r'\b(?:ESPECES|CASH|LIQUIDE|NAKIT)\b',          'cash',    0.95),
        (r'\b(?:VIREMENT|TRANSFER|CHEQUE|CHÈQUE)\b',     'transfer',0.90),
        (r'\b(?:CREDIT)\b',                               'card',    0.88),
        (r'\b(?:FLOUCI|SOBFLOUS|D17|PAYMEE)\b',          'mobile',  0.92),
    ]
    for pattern, val, conf in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return ReceiptField(value=val, confidence=conf,
                                method="keyword", raw_value=val)
    return None


# ══════════════════════════════════════════════════════════════
# CATÉGORIE — MULTILINGUE
# ══════════════════════════════════════════════════════════════

CATEGORY_KEYWORDS = {
    'restaurant': [
        # FR
        'restaurant', 'plat', 'menu', 'repas', 'déjeuner', 'dîner',
        'entrée', 'dessert', 'pizzeria', 'grill', 'brasserie', 'table',
        # EN
        'food', 'meal', 'lunch', 'dinner', 'fast food', 'sub total',
        # TR
        'kebap', 'yemek', 'lokanta',
        # IN
        'uttapam', 'thali', 'dosa',
    ],
    'cafe': [
        'café', 'coffee', 'cappuccino', 'espresso', 'latte',
        'thé', 'tea', 'croissant', 'pâtisserie', 'boulangerie',
        'cold coffee', 'shake',
    ],
    'taxi': [
        'uber', 'bolt', 'careem', 'taxi', 'vtc',
        'course', 'trajet', 'trip', 'fare', 'tarif',
        'heure début', 'heure arrivée', 'distance',
        'km', 'kilomètre', 'driver',
        # Bruxelles
        'bruxellois', 'licence', 'immat',
    ],
    'fuel': [
        'carburant', 'essence', 'gasoil', 'diesel', 'fuel',
        'station', 'pompe', 'litre', 'sans-plomb',
        'total energie', 'star', 'agil', 'somico',
    ],
    'parking': [
        'parking', 'stationnement', 'horodateur',
    ],
    'hotel': [
        'hotel', 'hôtel', 'chambre', 'nuit', 'séjour',
        'check-in', 'check-out', 'room', 'night', 'hébergement',
    ],
    'supermarket': [
        'supermarché', 'supermarket', 'épicerie', 'grocery',
        'vegetables', 'beans', 'tofu', 'potato',
        'carrefour', 'monoprix', 'aziza', 'consign',
        'balance due', 'total number of items',
    ],
    'transport': [
        'train', 'metro', 'bus', 'tram', 'billet',
        'sncft', 'transtu', 'navette',
    ],
    'office': [
        'fournitures', 'bureau', 'papeterie', 'cartouche',
        'imprimante', 'stylo', 'office', 'supplies',
    ],
}


def _detect_category(text: str) -> ReceiptField:
    text_lower = text.lower()

    # 1. Commerçants connus → catégorie directe
    for pattern, (name, conf, category) in KNOWN_MERCHANTS.items():
        if re.search(pattern, text, re.IGNORECASE):
            return ReceiptField(
                value=category, confidence=conf,
                method=f"known_{name}", raw_value=name
            )

    # 2. Scoring mots-clés
    scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score     = 0
        matched   = []
        for kw in keywords:
            if kw.lower() in text_lower:
                score += 1
                matched.append(kw)
        if score > 0:
            scores[cat] = (score, matched)

    if not scores:
        return ReceiptField(
            value='other', confidence=0.30,
            method="default_other",
            issues=["Catégorie non détectée"]
        )

    best_cat   = max(scores, key=lambda c: scores[c][0])
    best_score = scores[best_cat][0]
    matched    = scores[best_cat][1]
    total_kw   = len(CATEGORY_KEYWORDS[best_cat])
    conf       = 0.50 + min(best_score / max(total_kw * 0.3, 1), 1.0) * 0.45

    return ReceiptField(
        value=best_cat,
        confidence=round(conf, 2),
        method=f"keyword_scoring ({best_score} matches)",
        raw_value=", ".join(matched[:5])
    )


# ══════════════════════════════════════════════════════════════
# HELPER — Parser un montant
# ══════════════════════════════════════════════════════════════

def _parse_amount(raw: str) -> Optional[float]:
    if not raw:
        return None
    # Supprimer * (format turc), espaces, symboles devise
    cleaned = re.sub(r'[^\d,\.]', '', raw.strip().replace('*', ''))
    if not cleaned:
        return None
    if ',' in cleaned and '.' in cleaned:
        if cleaned.index(',') > cleaned.index('.'):
            cleaned = cleaned.replace('.', '').replace(',', '.')
        else:
            cleaned = cleaned.replace(',', '')
    elif ',' in cleaned:
        cleaned = cleaned.replace(',', '.')
    try:
        val = float(cleaned)
        return round(val, 3) if val > 0 else None
    except ValueError:
        return None

def needs_user_input(self) -> dict:
    """
    ✅ Retourne un dict des champs que l'utilisateur
    doit remplir manuellement car l'OCR n'est pas sûr.

    Le frontend React utilise ce dict pour afficher
    uniquement les champs nécessaires (pas tout le formulaire).
    """
    required = {}

    # Devise inconnue → TOUJOURS demander
    if not self.currency or not self.currency.value:
        required["currency"] = {
            "reason"  : "Devise non détectée automatiquement",
            "options" : ["TND", "EUR", "USD", "GBP", "TRY", "CHF"],
            "type"    : "select"
        }
    elif self.currency.confidence < 0.70:
        required["currency"] = {
            "reason"     : f"Devise incertaine ({self.currency.method})",
            "suggested"  : self.currency.value,
            "confidence" : self.currency.confidence,
            "options"    : ["TND", "EUR", "USD", "GBP", "TRY", "CHF"],
            "type"       : "select_with_suggestion"
        }

    # Montant non trouvé → obligatoire
    if not self.total_amount or not self.total_amount.value:
        required["total_amount"] = {
            "reason" : "Montant total non extrait par OCR",
            "type"   : "number"
        }

    # Date manquante → demander
    if not self.receipt_date or not self.receipt_date.value:
        required["receipt_date"] = {
            "reason" : "Date non détectée",
            "type"   : "date"
        }

    # Commerçant incertain
    if not self.merchant_name or self.merchant_name.confidence < 0.60:
        required["merchant_name"] = {
            "reason"    : "Nom du commerçant incertain",
            "suggested" : self.merchant_name.value if self.merchant_name else None,
            "type"      : "text"
        }

    # Catégorie inconnue → proposer une liste
    if not self.category_code or self.category_code.value == "other":
        required["category_code"] = {
            "reason"  : "Catégorie non détectée automatiquement",
            "options" : ["restaurant", "cafe", "taxi", "fuel",
                         "parking", "hotel", "supermarket",
                         "transport", "office", "other"],
            "type"    : "select"
        }

    # Mode de paiement → optionnel mais utile
    if not self.payment_method:
        required["payment_method"] = {
            "reason"   : "Mode de paiement non détecté",
            "options"  : ["cash", "card", "transfer", "mobile"],
            "required" : False,
            "type"     : "select"
        }

    return required