from app.ocr.ocr import extract_text

def process_invoice(file):
    text = extract_text(file)
    return {"text": text}