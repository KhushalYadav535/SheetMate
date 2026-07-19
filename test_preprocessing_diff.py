import os
import sys
import io
import re
import cv2
import numpy as np
from PIL import Image, ImageEnhance
from paddleocr import PaddleOCR

paddle_ocr_engine = PaddleOCR(lang='en', enable_mkldnn=False)

def old_preprocess(img_path):
    img = Image.open(img_path).convert("RGB")
    img = img.convert("L")
    img = ImageEnhance.Contrast(img).enhance(1.6)
    img = img.convert("RGB")
    
    prep_path = img_path + "_old_prep.jpg"
    img.save(prep_path)
    cv_img = cv2.imread(prep_path)
    if os.path.exists(prep_path):
        os.remove(prep_path)
    return cv_img

def in_memory_jpeg_preprocess(img_path):
    pil_img = Image.open(img_path)
    img = pil_img.convert("RGB")
    img = img.convert("L")
    
    # Apply bilateral filter in OpenCV
    cv_gray = np.array(img)
    cv_filtered = cv2.bilateralFilter(cv_gray, 9, 75, 75)
    
    # Convert back to PIL for contrast enhancement
    img = Image.fromarray(cv_filtered)
    img = ImageEnhance.Contrast(img).enhance(1.6)
    img = img.convert("RGB")
    
    # In-memory JPEG save and read
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=90)
    img_bytes = buffer.getvalue()
    
    nparr = np.frombuffer(img_bytes, np.uint8)
    cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return cv_img

def run_ocr(img):
    texts = []
    try:
        result = paddle_ocr_engine.ocr(img, cls=False)
        if result and result[0]:
            for line in result[0]:
                text, conf = line[1]
                texts.append(text)
    except Exception as ocr_err:
        try:
            results = list(paddle_ocr_engine.predict(input=img))
            for res in results:
                if 'rec_texts' in res:
                    for t in res['rec_texts']:
                        texts.append(t)
        except Exception as pred_err:
            print("OCR failed:", pred_err)
    return texts

def main():
    img_path = "C:\\Users\\Ayush Karan\\Downloads\\WhatsApp Image 2026-06-11 at 03.05.30.jpeg"
    if not os.path.exists(img_path):
        print("Image not found at:", img_path)
        return
        
    cv_img_old = old_preprocess(img_path)
    cv_img_inmem = in_memory_jpeg_preprocess(img_path)
    
    print("cv_img_old: shape={}, dtype={}".format(cv_img_old.shape, cv_img_old.dtype))
    print("cv_img_inmem: shape={}, dtype={}".format(cv_img_inmem.shape, cv_img_inmem.dtype))
    
    print("\nOld Preprocess OCR:")
    print(run_ocr(cv_img_old))
    
    print("\nIn-Memory JPEG Preprocess OCR:")
    print(run_ocr(cv_img_inmem))

if __name__ == "__main__":
    main()
