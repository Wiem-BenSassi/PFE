# On importe PaddleOCR pour la reconnaissance optique de caractères (OCR).
from paddleocr import PaddleOCR
# Initialisation de l'objet OCR.
# Par défaut, PaddleOCR charge les modèles nécessaires pour détecter et reconnaître le texte.

ocr = PaddleOCR()
# Fonction pour extraire le texte d'un fichier.
def extract_text(file):
    result = ocr.ocr(file.file.read())
    return result