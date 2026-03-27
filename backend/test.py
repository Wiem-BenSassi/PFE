# test.py
# Fichier de test temporaire — supprimer après

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.services.regex_service import extract_text_from_pdf_or_image

with open("temp/2db99a10-4bff-4502-acd1-c0340a7b40e4.jpg", "rb") as f:
    bytes_data = f.read()

result = extract_text_from_pdf_or_image(bytes_data, "image/jpeg")
print(result["raw_text"])
try:
    from app.models.user_model     import User
    print("✅ User chargé         :", User.__tablename__)
except Exception as e:
    print("❌ Erreur User         :", e)

try:
    from app.models.document_model import Document, OcrResult
    print("✅ Document chargé     :", Document.__tablename__)
    print("✅ OcrResult chargé    :", OcrResult.__tablename__)
except Exception as e:
    print("❌ Erreur Document     :", e)

try:
    from app.models.invoice_model  import SupplierInvoice, InvoiceItem
    print("✅ SupplierInvoice     :", SupplierInvoice.__tablename__)
    print("✅ InvoiceItem         :", InvoiceItem.__tablename__)
except Exception as e:
    print("❌ Erreur Invoice      :", e)

print()
print("Test terminé !")

