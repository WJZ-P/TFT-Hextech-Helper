#!/usr/bin/env python3
"""
Focused failure analysis - examine specific failing frames
"""

import cv2
import easyocr
import numpy as np
import os
import re
from collections import Counter

print("=" * 80)
print("FAILURE ANALYSIS - FOCUSED TEST")
print("=" * 80)

# Initialize EasyOCR
print("\nInitializing EasyOCR...")
READER = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)
print("EasyOCR ready\n")


# Simple OCR - test each strategy separately
def ocr_simple(img, roi, strategy="original"):
    """Single strategy OCR"""
    x, y, w, h = roi
    ih, iw = img.shape[:2]

    if x >= iw or y >= ih or x + w <= 0 or y + h <= 0:
        return ""

    x, y = max(0, x), max(0, y)
    w, h = min(w, iw - x), min(h, ih - y)

    if w <= 2 or h <= 2:
        return ""

    crop = img[y : y + h, x : x + w]
    if crop.size == 0:
        return ""

    try:
        if strategy == "original":
            rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        elif strategy == "otsu":
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
        elif strategy == "high":
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
            rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
        elif strategy == "inv":
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)
            rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
        elif strategy == "inv_otsu":
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(
                gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
            )
            rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
        else:
            return ""

        res = READER.readtext(
            rgb, paragraph=False, min_size=1, text_threshold=0.0, low_text=0.0
        )
        txts = [t for _, t, _ in res if t.strip()]
        return " ".join(txts) if txts else ""
    except:
        return ""


# Test specific frames from each recording
recordings = [
    "examples/recordings/derived/screen-recording-20260322/frames",
    "examples/recordings/derived/screen-recording-20260323/frames",
    "examples/recordings/derived/screen-recording-20260323-2/frames",
    "examples/recordings/derived/screen-recording-20260323-3/frames",
    "examples/recordings/derived/screen-recording-20260324/frames",
]

# Test a few frames from each recording
test_frames_per_recording = 2

for frames_dir in recordings:
    if not os.path.exists(frames_dir):
        continue

    rec_name = os.path.basename(os.path.dirname(frames_dir))
    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])

    if len(frames) < test_frames_per_recording:
        test_frames = frames
    else:
        # Sample evenly
        step = len(frames) // test_frames_per_recording
        test_frames = [frames[i * step] for i in range(test_frames_per_recording)]

    print(f"\n{'=' * 60}")
    print(f"Recording: {rec_name}")
    print(f"{'=' * 60}")

    for frame_file in test_frames:
        img_path = os.path.join(frames_dir, frame_file)
        img = cv2.imread(img_path)
        if img is None:
            continue

        print(f"\nFrame: {frame_file}")
        print("-" * 40)

        # Test GOLD with different strategies
        print("\nGOLD detection:")
        GOLD_ROIS = [
            ((940, 415, 70, 45), "Primary"),
            ((950, 420, 60, 40), "Fallback 1"),
            ((930, 410, 80, 50), "Fallback 2 (wider)"),
        ]

        for roi, name in GOLD_ROIS:
            print(f"  ROI {name}: {roi}")
            for strategy in ["high", "inv", "otsu", "original"]:
                text = ocr_simple(img, roi, strategy)
                digits = re.findall(r"\d+", text)
                num = int(digits[0]) if digits else None
                if num is not None and 0 <= num <= 100:
                    print(f"    {strategy}: '{text}' -> {num} ✓")
                else:
                    print(f"    {strategy}: '{text}' -> {num}")

        # Test LEVEL
        print("\nLEVEL detection:")
        LEVEL_ROIS = [
            ((115, 440, 40, 35), "Primary"),
            ((110, 435, 50, 45), "Fallback 1"),
            ((120, 445, 30, 30), "Fallback 2 (tighter)"),
        ]

        for roi, name in LEVEL_ROIS:
            print(f"  ROI {name}: {roi}")
            for strategy in ["high", "inv", "otsu", "original"]:
                text = ocr_simple(img, roi, strategy)
                digits = re.findall(r"\d+", text)
                num = int(digits[0]) if digits else None
                if num is not None and 1 <= num <= 10:
                    print(f"    {strategy}: '{text}' -> {num} ✓")
                else:
                    print(f"    {strategy}: '{text}' -> {num}")

        # Test HP
        print("\nHP detection:")
        HP_ROIS = [
            ((940, 65, 45, 25), "Player 1"),
            ((940, 105, 45, 25), "Player 2"),
            ((940, 145, 45, 25), "Player 3"),
            ((940, 185, 45, 25), "Player 4"),
        ]

        for roi, name in HP_ROIS:
            print(f"  ROI {name}: {roi}")
            for strategy in ["original", "inv", "high", "otsu"]:
                text = ocr_simple(img, roi, strategy)
                digits = re.findall(r"\d+", text)
                num = int(digits[0]) if digits else None
                if num is not None and 50 <= num <= 100:
                    print(f"    {strategy}: '{text}' -> {num} ✓")
                else:
                    print(f"    {strategy}: '{text}' -> {num}")

        # Test SHOP COSTS
        print("\nSHOP COST detection:")
        SHOP_COST_ROIS = [
            ((385, 160, 25, 20), "Card 1"),
            ((535, 160, 25, 20), "Card 2"),
            ((680, 160, 25, 20), "Card 3"),
        ]

        for roi, name in SHOP_COST_ROIS:
            print(f"  ROI {name}: {roi}")
            for strategy in ["high", "inv", "otsu", "original"]:
                text = ocr_simple(img, roi, strategy)
                digits = re.findall(r"\d+", text)
                num = int(digits[0]) if digits else None
                if num is not None and 1 <= num <= 5:
                    print(f"    {strategy}: '{text}' -> {num} ✓")
                else:
                    print(f"    {strategy}: '{text}' -> {num}")

print("\n" + "=" * 80)
print("FAILURE ANALYSIS COMPLETE")
print("=" * 80)
