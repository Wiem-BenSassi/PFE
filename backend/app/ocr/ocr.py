from paddleocr import PaddleOCR

ocr = PaddleOCR()

def extract_text(file):
    result = ocr.ocr(file.file.read())
    return result