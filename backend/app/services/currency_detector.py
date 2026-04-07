# app/services/currency_detector.py
import re
from typing import Optional

COUNTRY_CURRENCY = {
    "france":"EUR","italie":"EUR","italy":"EUR","espagne":"EUR","spain":"EUR",
    "allemagne":"EUR","belgique":"EUR","belgium":"EUR","portugal":"EUR",
    "uk":"GBP","united kingdom":"GBP","england":"GBP","britain":"GBP",
    "usa":"USD","united states":"USD","america":"USD",
    "tunisie":"TND","tunisia":"TND","tunis":"TND",
    "maroc":"MAD","morocco":"MAD","algerie":"DZD","algeria":"DZD",
    "turkey":"TRY","turquie":"TRY","suisse":"CHF","switzerland":"CHF",
    "india":"INR","inde":"INR",
}

CITY_CURRENCY = {
    "paris":"EUR","lyon":"EUR","marseille":"EUR","nice":"EUR","bordeaux":"EUR",
    "toulouse":"EUR","strasbourg":"EUR","lille":"EUR","nantes":"EUR",
    "bruxelles":"EUR","brussels":"EUR","liege":"EUR",
    "rome":"EUR","milan":"EUR","naples":"EUR",
    "madrid":"EUR","barcelona":"EUR","seville":"EUR","valencia":"EUR",
    "london":"GBP","manchester":"GBP","birmingham":"GBP","chorley":"GBP",
    "new york":"USD","los angeles":"USD","chicago":"USD","miami":"USD",
    "tunis":"TND","sfax":"TND","sousse":"TND","bizerte":"TND",
    "nabeul":"TND","monastir":"TND","gabes":"TND","grombalia":"TND",
    "manouba":"TND","ariana":"TND",
    "istanbul":"TRY","ankara":"TRY","izmir":"TRY","adana":"TRY","seyhan":"TRY",
    "casablanca":"MAD","rabat":"MAD","marrakech":"MAD",
    "st maximin":"EUR","les mages":"EUR","chambon":"EUR","oyonnax":"EUR",
}

LANGUAGE_CURRENCY = {
    "total eur":"EUR","reste a payer":"EUR","sous total":"EUR",
    "sous-total":"EUR","t.v.a":"EUR","carte bleue":"EUR",
    "merci de votre visite":"EUR","montant a payer":"EUR",
    "heure debut":"EUR","heure arrivee":"EUR",
    "sales tax":"USD","wellness surcharge":"USD",
    "beverage sales tax":"USD","food sales tax":"USD",
    "thank you for your custom":"GBP","vat no":"GBP",
    "total importe":"EUR","gracias":"EUR","imp.iva":"EUR","iva":"EUR",
    "totale":"EUR","non fiscale":"EUR","coperto":"EUR",
    "toplam":"TRY","topkdv":"TRY","kdv":"TRY","nakit":"TRY","tarih":"TRY",
    "cgst":"INR","sgst":"INR",
    "dinars":"TND","millimes":"TND","bienvenue":"TND","dt":"TND",
}

SYMBOL_CURRENCY = {"€":"EUR","£":"GBP","₺":"TRY","₹":"INR","¥":"JPY"}


def detect_currency_smart(text: str) -> dict:
    if not text:
        return _unknown()
    t = text.lower()

    # Niveau 1 : code ISO
    iso = re.search(r'\b(EUR|USD|GBP|TND|TRY|CHF|INR|JPY|MAD|DZD|CAD|AUD)\b', text, re.IGNORECASE)
    if iso:
        return _result(iso.group(1).upper(), 0.99, "iso_code")

    # Niveau 2 : symboles
    for sym, curr in SYMBOL_CURRENCY.items():
        if sym in text:
            return _result(curr, 0.95, "symbol")
    if "$" in text:
        ctx = any(k in t for k in ["sales tax","wellness","usa","new york"])
        return _result("USD", 0.93 if ctx else 0.88, "dollar_symbol")

    # Niveau 3 : mots-clés langue
    for kw, curr in LANGUAGE_CURRENCY.items():
        if kw in t and curr:
            return _result(curr, 0.85, f"keyword:{kw}")

    # Niveau 4 : ville
    for city, curr in CITY_CURRENCY.items():
        if city in t:
            return _result(curr, 0.75, f"city:{city}")

    # Niveau 4b : pays
    for country, curr in COUNTRY_CURRENCY.items():
        if country in t:
            return _result(curr, 0.70, f"country:{country}")

    # Niveau 5 : préfixe téléphonique tunisien
    if re.search(r'\b(?:\+216|00216)\s*\d', text):
        return _result("TND", 0.65, "tn_phone")

    return _unknown()


def _result(currency, confidence, method):
    return {"currency": currency, "confidence": confidence, "method": method, "needs_user": False}

def _unknown():
    return {"currency": None, "confidence": 0.0, "method": "unknown", "needs_user": True}

def get_exchange_rate(currency: str) -> float:
    RATES = {
        "TND":1.0,"EUR":3.35,"USD":3.10,"GBP":3.90,
        "CHF":3.45,"TRY":0.095,"INR":0.037,
        "MAD":0.31,"DZD":0.023,"CAD":2.28,"AUD":1.98,"JPY":0.021,
    }
    return RATES.get((currency or "TND").upper(), 1.0)
