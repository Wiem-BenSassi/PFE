from paddleocr import PaddleOCR

ocr = PaddleOCR(lang="fr")

result = ocr.ocr("at1.jpg")

for line in result[0]:
    text = line[1][0]
    print(text)
