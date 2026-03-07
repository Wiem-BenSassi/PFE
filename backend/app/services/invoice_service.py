# On importe la fonction extract_text qui utilise PaddleOCR pour extraire le texte d'un fichier.

from app.ocr.ocr import extract_text
# Fonction principale pour traiter une facture.
def process_invoice(file):
    # On appelle la fonction extract_text pour récupérer le texte du fichier.
    text = extract_text(file)
    return {"text": text}