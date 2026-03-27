from paddleocr import PaddleOCR
import cv2

ocr = PaddleOCR(use_angle_cls=True, lang='fr')

def extract_text(image_path):

    img = cv2.imread(image_path)

    # 🔥 resize (مهم)
    img = cv2.resize(img, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 🔥 denoise
    gray = cv2.medianBlur(gray, 3)

    # 🔥 adaptive threshold (أقوى من threshold العادي)
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )

    # OCR
    result = ocr.ocr(thresh, cls=True)

    text = ""
    for line in result:
        for word in line:
            text += word[1][0] + " "

    return text