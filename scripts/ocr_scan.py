import sys
import os
import re
import subprocess
import tempfile
import shutil
import glob

# Try importing image preprocessing libraries (PIL/Pillow)
try:
    from PIL import Image, ImageEnhance
    PIL_AVAILABLE = True
except Exception as e:
    PIL_AVAILABLE = False
    print(f"WARNING: PIL not available, skipping preprocessing: {e}", file=sys.stderr)

# Try importing PaddleOCR for handwriting line fallback
try:
    from paddleocr import PaddleOCR
    # Initialize PaddleOCR with English and disable MKLDNN to avoid oneDNN compatibility crashes on Windows/Intel CPUs
    paddle_ocr_engine = PaddleOCR(lang='en', enable_mkldnn=False)
except Exception as e:
    paddle_ocr_engine = None
    print(f"WARNING: Direct PaddleOCR fallback initialization failed: {e}", file=sys.stderr)


def preprocess_for_paddleocr(image_path):
    """
    Preprocessing for PaddleOCR — crops the top 18% (removes pen/objects) and
    applies mild grayscale + contrast boost. 
    
    NOTE: We deliberately do NOT binarize here. Real handwritten photos have uneven
    lighting and camera noise — a global threshold destroys ink pixels and causes 
    PaddleOCR to detect nothing. PaddleOCR works best on natural-intensity grayscale images.
    """
    if not PIL_AVAILABLE:
        return image_path

    try:
        img = Image.open(image_path).convert("RGB")
        width, height = img.size

        # Step 1: Crop the top 18% — removes pens, erasers, hands placed on notebook
        top_crop = int(height * 0.18)
        img = img.crop((0, top_crop, width, height))

        # Step 2: Convert to grayscale (removes colour noise, pen brand text in pink)
        img = img.convert("L")

        # Step 3: Mild contrast boost to make ink stand out — NOT too aggressive
        img = ImageEnhance.Contrast(img).enhance(1.6)

        # Step 4: Convert back to RGB for PaddleOCR compatibility
        img = img.convert("RGB")

        ext = os.path.splitext(image_path)[1] or ".png"
        preprocessed_path = image_path.replace(ext, f"_paddle_preprocessed{ext}")
        img.save(preprocessed_path)
        print(f"[ocr_scan.py] PaddleOCR preprocessing done: cropped top 18%, grayscale, mild contrast 1.6x.", file=sys.stderr)
        return preprocessed_path

    except Exception as e:
        print(f"WARNING: PaddleOCR preprocessing failed: {e}. Using original image.", file=sys.stderr)
        return image_path



def preprocess_for_mineru(image_path):
    """
    Light preprocessing for MinerU — just crop the top 18% to remove objects/pen.
    MinerU needs a realistic image (not binarized), otherwise it misclassifies 
    handwriting regions as embedded image blocks.
    """
    if not PIL_AVAILABLE:
        return image_path

    try:
        img = Image.open(image_path).convert("RGB")
        width, height = img.size

        # Only crop the top 18% to remove pen/objects — keep the rest natural
        top_crop = int(height * 0.18)
        img = img.crop((0, top_crop, width, height))

        # Mild contrast boost only
        img = ImageEnhance.Contrast(img).enhance(1.4)

        ext = os.path.splitext(image_path)[1] or ".png"
        preprocessed_path = image_path.replace(ext, f"_mineru_preprocessed{ext}")
        img.save(preprocessed_path)
        print(f"[ocr_scan.py] MinerU preprocessing done: cropped top 18%, mild contrast boost.", file=sys.stderr)
        return preprocessed_path

    except Exception as e:
        print(f"WARNING: MinerU preprocessing failed: {e}. Using original image.", file=sys.stderr)
        return image_path


def is_mineru_output_usable(text):
    """
    Check if MinerU's markdown output contains actual readable text,
    not just embedded image references like ![](images/abc123.jpg).
    Returns True if there's enough real text to use for grading.
    """
    if not text or not text.strip():
        return False

    # Strip all markdown image references from the text
    text_without_images = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    # Strip markdown headings, table syntax, whitespace
    text_without_images = re.sub(r'[#|*_`>-]', '', text_without_images)
    clean_text = text_without_images.strip()

    # Must have at least 10 characters of real text (not just punctuation/whitespace)
    real_chars = re.sub(r'\s+', '', clean_text)
    if len(real_chars) < 10:
        print(f"[ocr_scan.py] MinerU output contains only image refs or too little text ({len(real_chars)} real chars). Triggering PaddleOCR fallback.", file=sys.stderr)
        return False

    return True


def run_paddle_ocr(image_path):
    if not paddle_ocr_engine:
        print("ERROR: PaddleOCR engine not initialized, cannot run fallback", file=sys.stderr)
        return ""

    # Strong preprocessing for PaddleOCR
    preprocessed_path = preprocess_for_paddleocr(image_path)

    try:
        results = list(paddle_ocr_engine.predict(input=preprocessed_path))
        extracted_text = []
        for res in results:
            if 'rec_texts' in res:
                extracted_text.extend(res['rec_texts'])
        text = "\n".join(extracted_text)
        print(f"[ocr_scan.py] PaddleOCR extracted {len(text)} chars.", file=sys.stderr)
        return text
    except Exception as e:
        print(f"ERROR: Direct PaddleOCR fallback failed: {e}", file=sys.stderr)
        return ""
    finally:
        # Clean up preprocessed temp file
        if preprocessed_path != image_path and os.path.exists(preprocessed_path):
            try:
                os.remove(preprocessed_path)
            except Exception:
                pass


def scan_image(image_path):
    if not os.path.exists(image_path):
        print(f"ERROR: File not found: {image_path}", file=sys.stderr)
        return ""

    # Light preprocessing for MinerU (just crop noise, keep image realistic)
    mineru_image_path = preprocess_for_mineru(image_path)

    # Create a unique temporary directory for MinerU output
    temp_out_dir = tempfile.mkdtemp(prefix="pracup_mineru_out_")

    try:
        # Enforce HF_HUB_DISABLE_SYMLINKS=1 to prevent WinError 1314 symlink privilege crashes on Windows
        env = os.environ.copy()
        env["HF_HUB_DISABLE_SYMLINKS"] = "1"
        env["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

        # Run MinerU CLI using pipeline backend for CPU execution and English language
        cmd = [
            sys.executable,
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

        result = subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)

        # Search recursively for the generated markdown file (.md)
        md_files = glob.glob(os.path.join(temp_out_dir, "**", "*.md"), recursive=True)
        if not md_files:
            print(f"WARNING: No markdown output from MinerU. Falling back to PaddleOCR.", file=sys.stderr)
            return run_paddle_ocr(image_path)

        # Read the parsed markdown content
        with open(md_files[0], "r", encoding="utf-8") as f:
            extracted_text = f.read().strip()

        # Check for known MinerU failure modes:
        # 1. HTML table structures (scrambles line order for notebook pages)
        # 2. Output is only markdown image references (MinerU mistook text for images)
        # 3. Empty output
        if "<table>" in extracted_text or "</table>" in extracted_text:
            print("[ocr_scan.py] MinerU detected table structures. Falling back to PaddleOCR.", file=sys.stderr)
            return run_paddle_ocr(image_path)

        if not is_mineru_output_usable(extracted_text):
            print("[ocr_scan.py] MinerU output is not usable (image refs only or empty). Falling back to PaddleOCR.", file=sys.stderr)
            return run_paddle_ocr(image_path)

        print(f"[ocr_scan.py] MinerU extracted {len(extracted_text)} chars successfully.", file=sys.stderr)
        return extracted_text

    except subprocess.CalledProcessError as e:
        print(f"WARNING: MinerU process failed. Falling back to PaddleOCR.", file=sys.stderr)
        return run_paddle_ocr(image_path)
    except Exception as e:
        print(f"WARNING: MinerU error {e}. Falling back to PaddleOCR.", file=sys.stderr)
        return run_paddle_ocr(image_path)
    finally:
        # Clean up MinerU preprocessed temp file
        if mineru_image_path != image_path and os.path.exists(mineru_image_path):
            try:
                os.remove(mineru_image_path)
            except Exception:
                pass
        # Clean up MinerU output directory
        try:
            shutil.rmtree(temp_out_dir, ignore_errors=True)
        except Exception as cleanup_err:
            print(f"WARNING: Temporary cleanup failed for {temp_out_dir}: {cleanup_err}", file=sys.stderr)


def main():
    if len(sys.argv) < 2:
        print("Usage: python ocr_scan.py <image_path_1> [image_path_2 ...]", file=sys.stderr)
        sys.exit(1)

    for path in sys.argv[1:]:
        text = scan_image(path)
        print(text)
        print("---IMAGE_BREAK---")


if __name__ == "__main__":
    main()
