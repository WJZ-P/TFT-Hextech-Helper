"""
Enhanced EasyOCR test with expanded scanning and preprocessing
"""

import os
import sys
import time
import re
from pathlib import Path

import easyocr
import numpy as np
import cv2

# EXPANDED x positions to cover more variation
X_POSITIONS = [250, 270, 290, 310, 330, 350, 370, 390, 410, 430, 450, 470]
CROP_WIDTH = 160
CROP_HEIGHT = 40


def preprocess_variants(image_path: str, x: int) -> list[np.ndarray]:
    """Create multiple preprocessing variants for robust OCR"""
    img = cv2.imread(image_path)
    if img is None:
        return []

    h, w = img.shape[:2]
    x = max(0, min(x, w - CROP_WIDTH))
    y = 0
    cropped = img[y : min(CROP_HEIGHT, h), x : min(x + CROP_WIDTH, w)]

    variants = []

    # Variant 1: Standard (resize + grayscale + threshold)
    resized = cv2.resize(
        cropped, (CROP_WIDTH * 3, CROP_HEIGHT * 3), interpolation=cv2.INTER_CUBIC
    )
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    _, thresh1 = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    variants.append(thresh1)

    # Variant 2: Just grayscale + normalize (no threshold)
    gray2 = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    normalized = cv2.normalize(gray2, None, 0, 255, cv2.NORM_MINMAX)
    variants.append(normalized)

    # Variant 3: CLAHE for better contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray2)
    variants.append(enhanced)

    # Variant 4: Higher threshold for white text on dark background
    _, thresh2 = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    variants.append(thresh2)

    return variants


def extract_stage(text: str) -> str | None:
    """Extract stage pattern from OCR text"""
    # Try various patterns
    patterns = [
        r"(\d)\s*[-—]\s*(\d)",  # Standard: 2-3 or 2—3
        r"(\d)\s+(\d)",  # Space separated: 2 3
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return f"{match.group(1)}-{match.group(2)}"
    return None


def test_easyocr_enhanced(image_path: str, reader: easyocr.Reader) -> dict:
    """Enhanced EasyOCR with multiple variants"""
    best_result = {
        "stage": None,
        "confidence": 0,
        "raw": "",
        "x_pos": None,
        "variant": None,
    }

    for x in X_POSITIONS:
        variants = preprocess_variants(image_path, x)

        for i, variant in enumerate(variants):
            try:
                rgb = cv2.cvtColor(variant, cv2.COLOR_GRAY2RGB)
                results = reader.readtext(
                    rgb, paragraph=False, min_size=8, text_threshold=0.3
                )

                for bbox, text, confidence in results:
                    text = text.strip()
                    stage = extract_stage(text)

                    if stage and confidence * 100 > best_result["confidence"]:
                        best_result = {
                            "stage": stage,
                            "confidence": confidence * 100,
                            "raw": text,
                            "x_pos": x,
                            "variant": i,
                        }
            except Exception:
                continue

    return best_result


def main():
    sample_dir = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "examples/recordings/derived/screen-recording-20260323/frames"
    )

    files = sorted([f for f in os.listdir(sample_dir) if f.endswith(".jpg")])
    print(f"Testing {len(files)} frames from {sample_dir}")
    print(f"X positions: {X_POSITIONS}")
    print("=" * 60)

    print("Initializing EasyOCR...")
    reader = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)
    print("EasyOCR ready!\n")

    passed = 0
    stages = {}
    x_pos_success = {}  # Track which x positions work best

    for i, file in enumerate(files):
        result = test_easyocr_enhanced(os.path.join(sample_dir, file), reader)

        if result["stage"]:
            passed += 1
            stages[result["stage"]] = stages.get(result["stage"], 0) + 1
            x = result["x_pos"]
            x_pos_success[x] = x_pos_success.get(x, 0) + 1

        if (i + 1) % 30 == 0:
            current_rate = passed / (i + 1) * 100
            print(f"  {i + 1}/{len(files)} - Current rate: {current_rate:.1f}%")

    print("\n" + "=" * 60)
    print("ENHANCED EASYOCR RESULTS")
    print("=" * 60)
    print(f"Pass rate: {passed}/{len(files)} ({passed / len(files) * 100:.1f}%)")
    print(f"Unique stages: {len(stages)}")

    print("\nStage distribution:")
    for stage in sorted(
        stages.keys(), key=lambda s: (int(s.split("-")[0]), int(s.split("-")[1]))
    ):
        print(f"  {stage}: {stages[stage]}")

    print("\nX position success distribution:")
    for x in sorted(x_pos_success.keys()):
        print(
            f"  x={x}: {x_pos_success[x]} ({x_pos_success[x] / passed * 100:.1f}% of successes)"
        )


if __name__ == "__main__":
    main()
