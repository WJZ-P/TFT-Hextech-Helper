#!/usr/bin/env python3
"""
Quick verification test - 10 frames per recording
"""

import cv2
import easyocr
import numpy as np
import os
import re
import json
from collections import Counter, defaultdict
import time

print("=" * 60)
print("QUICK VERIFICATION TEST")
print("=" * 60)

# Initialize EasyOCR
print("\nInitializing EasyOCR...")
READER = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)
print("EasyOCR ready\n")

# Corrections
CORRECTIONS = {
    "O": "0",
    "o": "0",
    "l": "1",
    "I": "1",
    "S": "5",
    "s": "5",
    "B": "8",
    "{": "8",
    "}": "3",
    "!": "1",
    "|": "1",
    "(": "0",
    "c": "0",
    "声": "萨",
    "萑": "崔",
    "左": "佐",
    "斤": "斯",
    "产": "萨",
    "霾": "蔚",
    "仔": "伊",
    "严": "萨",
    "困": "因",
    "蕾": "蔚",
}


def correct(text):
    if not text:
        return text
    for w, c in CORRECTIONS.items():
        text = text.replace(w, c)
    return text


def extract_num(text):
    if not text:
        return None
    digits = re.findall(r"\d+", correct(text))
    return int(digits[0]) if digits else None


def extract_name(text):
    if not text:
        return None
    corrected = correct(text)
    chars = "".join(c for c in corrected if "\u4e00" <= c <= "\u9fff")
    return chars if len(chars) >= 2 else None


def ocr_strategy(img, roi, strategy="original"):
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
        else:
            return ""

        res = READER.readtext(
            rgb, paragraph=False, min_size=1, text_threshold=0.0, low_text=0.0
        )
        txts = [t for _, t, _ in res if t.strip()]
        return " ".join(txts) if txts else ""
    except:
        return ""


# ROI definitions
STAGE_ROI = (370, 8, 160, 25)
GOLD_ROIS = [(940, 415, 70, 45), (950, 420, 60, 40), (930, 410, 80, 50)]
LEVEL_ROIS = [(115, 440, 40, 35), (110, 435, 50, 45), (120, 445, 30, 30)]
HP_ROIS = [
    (930, 70, 55, 30),
    (930, 110, 55, 30),
    (930, 150, 55, 30),
    (930, 190, 55, 30),
]
SHOP_COST_ROIS = [(375, 155, 35, 30), (525, 155, 35, 30), (675, 155, 35, 30)]

# Test recordings
recordings = [
    "examples/recordings/derived/screen-recording-20260322/frames",
    "examples/recordings/derived/screen-recording-20260323/frames",
    "examples/recordings/derived/screen-recording-20260323-2/frames",
    "examples/recordings/derived/screen-recording-20260323-3/frames",
    "examples/recordings/derived/screen-recording-20260324/frames",
]

results = {"stage": [], "gold": [], "level": [], "hp": [], "shop_cost": []}

for frames_dir in recordings:
    if not os.path.exists(frames_dir):
        continue

    rec_name = os.path.basename(os.path.dirname(frames_dir))
    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])

    # Test 5 frames from each recording
    test_frames = frames[:10] if len(frames) >= 10 else frames

    print(f"\n{rec_name}:")

    for frame_file in test_frames:
        img = cv2.imread(os.path.join(frames_dir, frame_file))
        if img is None:
            continue

        # Stage
        stage_found = False
        for strategy in ["original", "high", "inv"]:
            text = ocr_strategy(img, STAGE_ROI, strategy)
            cleaned = "".join(c for c in correct(text) if c.isdigit() or c == "-")
            cleaned = cleaned.replace("—", "-").replace("–", "-")
            match = re.search(r"(\d)-(\d)", cleaned)
            if match:
                s, r = int(match.group(1)), int(match.group(2))
                if 1 <= s <= 7 and 1 <= r <= 7:
                    results["stage"].append(True)
                    stage_found = True
                    break
        if not stage_found:
            results["stage"].append(False)
            continue  # Skip frames without game UI

        # Gold
        gold_found = False
        for roi in GOLD_ROIS:
            for strategy in ["high", "original", "inv"]:
                text = ocr_strategy(img, roi, strategy)
                num = extract_num(text)
                if num is not None and 0 <= num <= 100:
                    results["gold"].append(True)
                    gold_found = True
                    break
            if gold_found:
                break
        if not gold_found:
            results["gold"].append(False)

        # Level
        level_found = False
        for roi in LEVEL_ROIS:
            for strategy in ["inv", "original", "high"]:
                text = ocr_strategy(img, roi, strategy)
                num = extract_num(text)
                if num is not None and 1 <= num <= 10:
                    results["level"].append(True)
                    level_found = True
                    break
            if level_found:
                break
        if not level_found:
            results["level"].append(False)

        # HP
        hp_found = False
        for roi in HP_ROIS:
            for strategy in ["original", "high", "inv"]:
                text = ocr_strategy(img, roi, strategy)
                num = extract_num(text)
                if num is not None and 50 <= num <= 100:
                    results["hp"].append(True)
                    hp_found = True
                    break
            if hp_found:
                break
        if not hp_found:
            results["hp"].append(False)

        # Shop cost
        shop_found = False
        for roi in SHOP_COST_ROIS:
            for strategy in ["original", "otsu", "high"]:
                text = ocr_strategy(img, roi, strategy)
                num = extract_num(text)
                if num is not None and 1 <= num <= 5:
                    results["shop_cost"].append(True)
                    shop_found = True
                    break
            if shop_found:
                break
        if not shop_found:
            results["shop_cost"].append(False)

# Print results
print("\n" + "=" * 60)
print("QUICK VERIFICATION RESULTS")
print("=" * 60)

for elem, res in results.items():
    if len(res) > 0:
        acc = sum(res) / len(res) * 100
        status = "✅" if acc >= 95 else ("⚠️" if acc >= 70 else "❌")
        print(f"{elem:<15} {sum(res):<6} {len(res):<6} {acc:.1f}% {status}")
