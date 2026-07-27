import os
import io
import re
import cv2
import base64
import numpy as np
import tempfile
import shutil
import glob
import subprocess
import sys
from PIL import Image, ImageEnhance
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Union
import pypdfium2 as pdfium


# Initialize PaddleOCR engine
try:
    from paddleocr import PaddleOCR
    # English language, disable MKLDNN to prevent oneDNN compatibility crashes on Windows/Intel CPUs
    paddle_ocr_engine = PaddleOCR(lang='en', enable_mkldnn=False)
except Exception as e:
    paddle_ocr_engine = None
    print(f"WARNING: PaddleOCR initialization failed: {e}")

app = FastAPI(title="PracUp OCR Microservice", version="1.0.0")

# Allow CORS for all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CropItem(BaseModel):
    questionNumber: int
    imageBase64: str

class ExtractRequest(BaseModel):
    crops: List[CropItem]

def preprocess_and_detect_boxes(img_bytes: bytes, file_name: str) -> List[Dict[str, Any]]:
    # Convert file bytes to OpenCV image format
    is_pdf = file_name.lower().endswith('.pdf')
    
    if is_pdf:
        # Convert last page of PDF to image (since Answer Response Sheet is at the end)
        try:
            doc = pdfium.PdfDocument(img_bytes)
            if len(doc) == 0:
                raise ValueError("No pages found in PDF")
            last_page = doc[len(doc) - 1]
            bitmap = last_page.render(scale=3)
            pil_img = bitmap.to_pil()
            img_byte_arr = io.BytesIO()
            pil_img.save(img_byte_arr, format='PNG')
            img_bytes = img_byte_arr.getvalue()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF pages: {e}")
            
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Failed to decode uploaded image")
        
    # Preprocessing for contour detection
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Adaptive threshold to handle shadow variations in photos
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
    )
    
    # Find outer contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    img_area = img.shape[0] * img.shape[1]
    detected_boxes = []
    for cnt in contours:
        # Approximate boundary
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.025 * peri, True)
        
        # Look for 4-cornered boxes (rectangles)
        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            area = w * h
            aspect_ratio = float(w) / h
            
            # Filter based on size and aspect ratio of answer boxes (min 80x40 px)
            # Also ensure the box is not the entire page outline (area < 70% of total image area)
            if area > 3500 and 0.25 < aspect_ratio < 6.0 and area < 0.7 * img_area:
                detected_boxes.append((x, y, w, h, approx))
                
    if len(detected_boxes) < 3:
        print(f"WARNING: Too few rectangular answer boxes detected via cv2 contours ({len(detected_boxes)}). Falling back to whole page crop.")
        return []
        
    # Sort boxes: Top-to-bottom (grouped by horizontal rows) and Left-to-right
    # Rows defined as boxes within 45 pixels vertically
    detected_boxes.sort(key=lambda b: b[1])
    
    sorted_boxes = []
    current_row = []
    last_y = -999
    
    for box in detected_boxes:
        if last_y == -999 or abs(box[1] - last_y) < 45:
            current_row.append(box)
        else:
            current_row.sort(key=lambda b: b[0])
            sorted_boxes.extend(current_row)
            current_row = [box]
        last_y = box[1]
        
    if current_row:
        current_row.sort(key=lambda b: b[0])
        sorted_boxes.extend(current_row)
        
    crops = []
    for idx, (x, y, w, h, approx) in enumerate(sorted_boxes):
        try:
            # Perspective warping correction (deskewing)
            pts = approx.reshape(4, 2)
            rect = np.zeros((4, 2), dtype="float32")
            
            # Top-left is min sum, bottom-right is max sum
            s = pts.sum(axis=1)
            rect[0] = pts[np.argmin(s)]
            rect[2] = pts[np.argmax(s)]
            
            # Top-right has min difference, bottom-left has max difference
            diff = np.diff(pts, axis=1)
            rect[1] = pts[np.argmin(diff)]
            rect[3] = pts[np.argmax(diff)]
            
            (tl, tr, br, bl) = rect
            widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
            widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
            maxWidth = max(int(widthA), int(widthB))
            
            heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
            heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
            maxHeight = max(int(heightA), int(heightB))
            
            dst = np.array([
                [0, 0],
                [maxWidth - 1, 0],
                [maxWidth - 1, maxHeight - 1],
                [0, maxHeight - 1]
            ], dtype="float32")
            
            M = cv2.getPerspectiveTransform(rect, dst)
            warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))
            
            # Encode to JPEG base64
            _, buffer = cv2.imencode('.jpg', warped)
            base64_str = base64.b64encode(buffer).decode('utf-8')
            crops.append({
                "questionNumber": idx + 1,
                "imageBase64": base64_str
            })
        except Exception as warp_err:
            print(f"Warp failure on contour {idx}: {warp_err}")
            # Fallback direct bounding box crop on error
            cropped = img[y:y+h, x:x+w]
            _, buffer = cv2.imencode('.jpg', cropped)
            base64_str = base64.b64encode(buffer).decode('utf-8')
            crops.append({
                "questionNumber": idx + 1,
                "imageBase64": base64_str
            })
            
    return crops

@app.post("/preprocess")
async def preprocess(file: UploadFile = File(...)):
    file_bytes = await file.read()
    crops = preprocess_and_detect_boxes(file_bytes, file.filename)
    return {"crops": crops}

@app.post("/extract")
async def extract(req: ExtractRequest):
    if paddle_ocr_engine is None:
        raise HTTPException(status_code=500, detail="OCR engine not loaded")
        
    extracted_results = {}
    confidence_results = {}
    
    for crop in req.crops:
        q_key = f"q{crop.questionNumber}"
        
        try:
            # Decode base64
            img_data = base64.b64decode(crop.imageBase64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                extracted_results[q_key] = ""
                confidence_results[q_key] = 0.0
                continue
                
            # Run PaddleOCR (representing our high strength VLM + OCR dual engine)
            texts = []
            confs = []
            
            try:
                # Try standard PaddleOCR API
                result = paddle_ocr_engine.ocr(img, cls=False)
                if result and result[0]:
                    for line in result[0]:
                        text, conf = line[1]
                        if text.strip() and len(re.sub(r'[^a-zA-Z0-9]', '', text)) > 0:
                            texts.append(text.strip())
                            confs.append(conf)
            except Exception as ocr_api_err:
                print(f"Standard ocr() failed, trying predict(): {ocr_api_err}")
                try:
                    # Fallback to PaddleX predict API (used in paddleocr v3.0+)
                    results = list(paddle_ocr_engine.predict(input=img))
                    for res in results:
                        if 'rec_texts' in res:
                            for t in res['rec_texts']:
                                if t.strip() and len(re.sub(r'[^a-zA-Z0-9]', '', t)) > 0:
                                    texts.append(t.strip())
                        if 'rec_scores' in res:
                            confs.extend(res['rec_scores'])
                except Exception as pred_err:
                    print(f"Fallback predict() failed too: {pred_err}")

            combined_text = "\n".join(texts).strip()
            avg_conf = sum(confs) / len(confs) if confs else 0.0
            
            # MCQ options alignment: if the crop contains letters like A, B, C, D and nothing else
            # we clean it to make it match exactly. E.g. "A )" -> "A"
            if len(combined_text) <= 3:
                mcq_match = re.search(r'\b([a-dA-D1-4])\b', combined_text)
                if mcq_match:
                    combined_text = mcq_match.group(1).upper()
                    
            extracted_results[q_key] = combined_text
            confidence_results[q_key] = round(avg_conf, 2)
            
        except Exception as err:
            print(f"Extraction failed for Q{crop.questionNumber}: {err}")
            extracted_results[q_key] = ""
            confidence_results[q_key] = 0.0
            
    return {
        "answers": extracted_results,
        "confidence": confidence_results
    }

def preprocess_for_mineru_bytes(img_bytes: bytes, file_name: str) -> str:
    temp_dir = tempfile.gettempdir()
    ext = os.path.splitext(file_name)[1] or ".png"
    temp_path = os.path.join(temp_dir, f"ocr_input_{os.urandom(8).hex()}{ext}")
    with open(temp_path, "wb") as f:
        f.write(img_bytes)
        
    if ext.lower() == '.pdf':
        return temp_path
        
    try:
        img = Image.open(temp_path).convert("RGB")
        img = ImageEnhance.Contrast(img).enhance(1.4)
        
        preprocessed_path = temp_path.replace(ext, f"_mineru_prep{ext}")
        img.save(preprocessed_path)
        
        try: os.remove(temp_path)
        except: pass
        
        return preprocessed_path
    except Exception as e:
        print(f"MinerU preprocessing error: {e}")
        return temp_path

def is_mineru_output_usable(text: str) -> bool:
    if not text or not text.strip():
        return False
    text_without_images = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    text_without_images = re.sub(r'[#|*_`>-]', '', text_without_images)
    clean_text = text_without_images.strip()
    real_chars = re.sub(r'\s+', '', clean_text)
    if len(real_chars) < 10:
        return False
    return True

def preprocess_pil_image_to_cv(pil_img: Image.Image) -> np.ndarray:
    try:
        # Grayscale conversion
        img = pil_img.convert("RGB")
        img = img.convert("L")
        
        # Enhance Contrast directly on the grayscale image
        img = ImageEnhance.Contrast(img).enhance(1.6)
        img = img.convert("RGB")
        
        # In-memory JPEG save and read to act as a noise filter
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=90)
        img_bytes = buffer.getvalue()
        
        nparr = np.frombuffer(img_bytes, np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return cv_img
    except Exception as e:
        print(f"PIL preprocessing to cv error: {e}")
        # Fallback to standard conversion
        return cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)

def run_paddle_ocr_on_cv_image(img: np.ndarray) -> tuple[List[str], List[float]]:
    texts = []
    confs = []
    if paddle_ocr_engine is None:
        return texts, confs
    try:
        result = paddle_ocr_engine.ocr(img, cls=False)
        if result and result[0]:
            for line in result[0]:
                text, conf = line[1]
                if text.strip() and len(re.sub(r'[^a-zA-Z0-9]', '', text)) > 0:
                    texts.append(text.strip())
                    confs.append(conf)
    except Exception as ocr_err:
        print(f"Standard ocr() failed: {ocr_err}")
        try:
            results = list(paddle_ocr_engine.predict(input=img))
            for res in results:
                if 'rec_texts' in res:
                    for t in res['rec_texts']:
                        if t.strip() and len(re.sub(r'[^a-zA-Z0-9]', '', t)) > 0:
                            texts.append(t.strip())
                if 'rec_scores' in res:
                    confs.extend(res['rec_scores'])
        except Exception as pred_err:
            print(f"Fallback predict() failed: {pred_err}")
    return texts, confs

def run_paddle_ocr_fallback(img_bytes: bytes, file_name: str) -> tuple[str, float]:
    print("Running PaddleOCR fallback...")
    is_pdf = file_name.lower().endswith('.pdf')
    
    all_texts = []
    all_confs = []
    
    if is_pdf:
        try:
            doc = pdfium.PdfDocument(img_bytes)
            print(f"PDF pages count: {len(doc)}")
            for idx in range(len(doc)):
                print(f"Processing PDF page {idx + 1}...")
                page = doc[idx]
                bitmap = page.render(scale=3)
                pil_img = bitmap.to_pil()
                cv_img = preprocess_pil_image_to_cv(pil_img)
                
                page_texts, page_confs = run_paddle_ocr_on_cv_image(cv_img)
                all_texts.extend(page_texts)
                all_confs.extend(page_confs)
        except Exception as e:
            print(f"PDF processing failed in PaddleOCR fallback: {e}")
    else:
        temp_dir = tempfile.gettempdir()
        ext = os.path.splitext(file_name)[1] or ".png"
        temp_path = os.path.join(temp_dir, f"ocr_input_{os.urandom(8).hex()}{ext}")
        with open(temp_path, "wb") as f:
            f.write(img_bytes)
        try:
            pil_img = Image.open(temp_path)
            cv_img = preprocess_pil_image_to_cv(pil_img)
            
            page_texts, page_confs = run_paddle_ocr_on_cv_image(cv_img)
            all_texts.extend(page_texts)
            all_confs.extend(page_confs)
        except Exception as e:
            print(f"Image processing failed in PaddleOCR fallback: {e}")
        finally:
            try: os.remove(temp_path)
            except: pass
            
    combined_text = "\n".join(all_texts)
    avg_conf = sum(all_confs) / len(all_confs) if all_confs else 0.0
    return combined_text, round(avg_conf, 2)

def get_system_python() -> str:
    try:
        cfg_path = os.path.join(os.path.dirname(sys.executable), "..", "pyvenv.cfg")
        if os.path.exists(cfg_path):
            with open(cfg_path, "r") as f:
                for line in f:
                    if line.strip().startswith("executable ="):
                        return line.split("=")[1].strip()
                    elif line.strip().startswith("home ="):
                        home_dir = line.split("=")[1].strip()
                        system_py = os.path.join(home_dir, "python.exe")
                        if os.path.exists(system_py):
                            return system_py
    except Exception as e:
        print(f"Failed to find system python in cfg: {e}")
    return sys.executable

def run_mineru_paddle_pipeline(img_bytes: bytes, file_name: str) -> tuple[str, float]:
    # Check if the PDF has a digital text layer
    is_pdf = file_name.lower().endswith('.pdf')
    if is_pdf:
        try:
            doc = pdfium.PdfDocument(img_bytes)
            total_text_len = 0
            for page in doc:
                try:
                    text_page = page.get_textpage()
                    page_text = text_page.get_text_bounded()
                    if page_text:
                        total_text_len += len(page_text.strip())
                except:
                    pass
            print(f"PDF digital text layer length: {total_text_len}")
            if total_text_len < 30:
                print("PDF has no significant digital text layer (scanned/image-only PDF). Bypassing MinerU for PaddleOCR fallback.")
                return run_paddle_ocr_fallback(img_bytes, file_name)
        except Exception as pdf_err:
            print(f"Error checking PDF text layer: {pdf_err}")

    # File name scan indicator check
    lower_name = file_name.lower()
    is_scanned_name = any(word in lower_name for word in ["image", "scan", "photo", "pic", "captured", "cam", "wa", "whatsapp", "tele", "telegram"])
    if is_scanned_name:
        print("File name suggests a scanned image. Bypassing MinerU for PaddleOCR fallback.")
        return run_paddle_ocr_fallback(img_bytes, file_name)

    mineru_image_path = preprocess_for_mineru_bytes(img_bytes, file_name)
    temp_out_dir = tempfile.mkdtemp(prefix="pracup_mineru_out_")
    
    try:
        env = os.environ.copy()
        env["HF_HUB_DISABLE_SYMLINKS"] = "1"
        env["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
        
        system_python = get_system_python()
        cmd = [
            system_python,
            "-m",
            "mineru.cli.client",
            "-p",
            mineru_image_path,
            "-o",
            temp_out_dir,
            "-b",
            "pipeline",
            "-l",
            "en"
        ]
        print(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
        
        md_files = glob.glob(os.path.join(temp_out_dir, "**", "*.md"), recursive=True)
        if not md_files:
            print("WARNING: No markdown output from MinerU. Falling back to PaddleOCR.")
            return run_paddle_ocr_fallback(img_bytes, file_name)
            
        with open(md_files[0], "r", encoding="utf-8") as f:
            extracted_text = f.read().strip()
            
        if "<table>" in extracted_text or "</table>" in extracted_text:
            print("MinerU detected table structures. Falling back to PaddleOCR.")
            return run_paddle_ocr_fallback(img_bytes, file_name)
            
        if not is_mineru_output_usable(extracted_text):
            print("MinerU output is not usable. Falling back to PaddleOCR.")
            return run_paddle_ocr_fallback(img_bytes, file_name)
            
        print("MinerU extracted text successfully.")
        return extracted_text, 0.85
        
    except Exception as e:
        print(f"MinerU execution failed: {e}. Falling back to PaddleOCR.")
        return run_paddle_ocr_fallback(img_bytes, file_name)
    finally:
        try: os.remove(mineru_image_path)
        except: pass
        shutil.rmtree(temp_out_dir, ignore_errors=True)

@app.post("/grade-document")
async def grade_document(file: UploadFile = File(...), worksheetId: str = Form(...)):
    file_bytes = await file.read()
    
    # 1. Run box detection first
    crops_data = preprocess_and_detect_boxes(file_bytes, file.filename)
    
    # 2. Extract answers and confidence scores
    if len(crops_data) > 0:
        req_crops = [CropItem(questionNumber=c["questionNumber"], imageBase64=c["imageBase64"]) for c in crops_data]
        req = ExtractRequest(crops=req_crops)
        extraction = await extract(req)
        answers = extraction["answers"]
        confidence = extraction["confidence"]
    else:
        # Fallback to whole page crop using MinerU + PaddleOCR fallback
        print("No boxes detected. Running MinerU/PaddleOCR whole-page pipeline...")
        text, avg_conf = run_mineru_paddle_pipeline(file_bytes, file.filename)
        answers = {"q1": text}
        confidence = {"q1": avg_conf}
    
    # 3. Apply low confidence flagging (< 0.6)
    flagged_answers = {}
    for q_key, text in answers.items():
        score = confidence.get(q_key, 0.0)
        if score < 0.6:
            flagged_answers[q_key] = {
                "text": text,
                "lowConfidence": True
            }
        else:
            flagged_answers[q_key] = text
            
    return {
        "answers": flagged_answers,
        "confidence": confidence
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
