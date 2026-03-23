"""
OCR Comparison Test: Tesseract vs EasyOCR
Compares both engines on stage recognition from TFT recording frames.
"""

import os
import sys
import time
import json
import re
from pathlib import Path

# OCR imports
import easyocr
from PIL import Image
import numpy as np
import cv2

# Try to import Tesseract
try:
    import pytesseract

    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("Warning: pytesseract not available, install with: pip install pytesseract")

X_POSITIONS = [280, 300, 320, 340, 360, 380, 400, 420]
CROP_WIDTH = 140
CROP_HEIGHT = 32


def preprocess_image(image_path: str, x: int, scale: int = 3) -> np.ndarray:
    """Preprocess image similar to reference repos (grayscale + thresholding)"""
    img = cv2.imread(image_path)
    if img is None:
        return None

    # Crop
    h, w = img.shape[:2]
    x = min(x, w - CROP_WIDTH)
    cropped = img[0 : min(CROP_HEIGHT, h), x : min(x + CROP_WIDTH, w)]

    # Resize 3x
    resized = cv2.resize(
        cropped,
        (CROP_WIDTH * scale, CROP_HEIGHT * scale),
        interpolation=cv2.INTER_CUBIC,
    )

    # Grayscale
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

    # Thresholding (like reference repos)
    _, thresholded = cv2.threshold(
        gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    return thresholded


def extract_stage_text(text: str) -> str | None:
    """Extract stage pattern (X-Y) from OCR text"""
    match = re.search(r"(\d)-(\d)", text)
    return match[0] if match else None


def test_tesseract(image_path: str) -> dict:
    """Test Tesseract OCR with adaptive positioning"""
    if not TESSERACT_AVAILABLE:
        return {
            "engine": "tesseract",
            "stage": None,
            "confidence": 0,
            "error": "not available",
        }

    best_result = {"stage": None, "confidence": 0, "raw": ""}

    for x in X_POSITIONS:
        processed = preprocess_image(image_path, x)
        if processed is None:
            continue

        try:
            # Configure Tesseract
            custom_config = r"--oem 3 --psm 7 -c tessedit_char_whitelist=0123456789-"
            text = pytesseract.image_to_string(processed, config=custom_config).strip()

            stage = extract_stage_text(text)
            if stage:
                # Get confidence
                data = pytesseract.image_to_data(
                    processed, config=custom_config, output_type=pytesseract.Output.DICT
                )
                confidences = [int(c) for c in data["conf"] if int(c) > 0]
                avg_confidence = (
                    sum(confidences) / len(confidences) if confidences else 0
                )

                if avg_confidence > best_result["confidence"]:
                    best_result = {
                        "stage": stage,
                        "confidence": avg_confidence,
                        "raw": text,
                        "x_pos": x,
                    }
        except Exception as e:
            continue

    return {"engine": "tesseract", **best_result}


def test_easyocr(image_path: str, reader: easyocr.Reader) -> dict:
    """Test EasyOCR with adaptive positioning"""
    best_result = {"stage": None, "confidence": 0, "raw": ""}

    for x in X_POSITIONS:
        processed = preprocess_image(image_path, x)
        if processed is None:
            continue

        try:
            # EasyOCR expects RGB
            rgb = cv2.cvtColor(processed, cv2.COLOR_GRAY2RGB)

            results = reader.readtext(rgb, paragraph=False, min_size=10)

            for bbox, text, confidence in results:
                text = text.strip()
                stage = extract_stage_text(text)
                if stage and confidence * 100 > best_result["confidence"]:
                    best_result = {
                        "stage": stage,
                        "confidence": confidence * 100,
                        "raw": text,
                        "x_pos": x,
                    }
        except Exception as e:
            continue

    return {"engine": "easyocr", **best_result}


def main():
    # Get sample directory
    sample_dir = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "examples/recordings/derived/screen-recording-20260322/frames"
    )

    # Get files
    files = sorted([f for f in os.listdir(sample_dir) if f.endswith(".jpg")])
    print(f"Testing {len(files)} frames from {sample_dir}")
    print("=" * 60)

    # Initialize EasyOCR
    print("Initializing EasyOCR (first run downloads model)...")
    reader = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)
    print("EasyOCR ready!\n")

    # Track results
    results = {
        "tesseract": {"passed": 0, "total": 0, "stages": {}},
        "easyocr": {"passed": 0, "total": 0, "stages": {}},
    }

    # Test each frame
    for i, file in enumerate(files):
        file_path = os.path.join(sample_dir, file)

        # Test both engines
        tess_result = test_tesseract(file_path)
        easy_result = test_easyocr(file_path, reader)

        # Update counts
        results["tesseract"]["total"] += 1
        results["easyocr"]["total"] += 1

        if tess_result["stage"]:
            results["tesseract"]["passed"] += 1
            results["tesseract"]["stages"][tess_result["stage"]] = (
                results["tesseract"]["stages"].get(tess_result["stage"], 0) + 1
            )

        if easy_result["stage"]:
            results["easyocr"]["passed"] += 1
            results["easyocr"]["stages"][easy_result["stage"]] = (
                results["easyocr"]["stages"].get(easy_result["stage"], 0) + 1
            )

        # Progress
        if (i + 1) % 20 == 0:
            print(f"  Processed {i + 1}/{len(files)} frames...")

    # Print results
    print("\n" + "=" * 60)
    print("COMPARISON RESULTS")
    print("=" * 60)

    for engine in ["tesseract", "easyocr"]:
        r = results[engine]
        pass_rate = (r["passed"] / r["total"] * 100) if r["total"] > 0 else 0
        print(f"\n{engine.upper()}:")
        print(f"  Pass rate: {r['passed']}/{r['total']} ({pass_rate:.1f}%)")
        print(f"  Unique stages detected: {len(r['stages'])}")

    # Determine winner
    tess_rate = (
        results["tesseract"]["passed"] / results["tesseract"]["total"] * 100
        if results["tesseract"]["total"] > 0
        else 0
    )
    easy_rate = (
        results["easyocr"]["passed"] / results["easyocr"]["total"] * 100
        if results["easyocr"]["total"] > 0
        else 0
    )

    print("\n" + "=" * 60)
    if easy_rate > tess_rate:
        print(f"WINNER: EasyOCR ({easy_rate:.1f}% vs {tess_rate:.1f}%)")
    elif tess_rate > easy_rate:
        print(f"WINNER: Tesseract ({tess_rate:.1f}% vs {easy_rate:.1f}%)")
    else:
        print(f"TIE: Both at {tess_rate:.1f}%")
    print("=" * 60)

    # Save results to JSON
    output_path = "tmp/ocr_comparison_results.json"
    os.makedirs("tmp", exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {output_path}")


if __name__ == "__main__":
    main()
