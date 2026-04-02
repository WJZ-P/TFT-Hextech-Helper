#!/usr/bin/env python3
"""
Shop cost ROI optimization - find best position for cost detection
"""

import cv2
import easyocr
import numpy as np
import re
import os

print("=" * 60)
print("SHOP COST ROI OPTIMIZATION")
print("=" * 60)

READER = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)


def ocr(img, roi, strategy="orig"):
    x, y, w, h = roi
    crop = img[y : y + h, x : x + w]
    if crop.size == 0:
        return ""
    try:
        if strategy == "orig":
            rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        elif strategy == "high":
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
            rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
        elif strategy == "inv":
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)
            rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
        elif strategy == "otsu":
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
        else:
            return ""
        res = READER.readtext(
            rgb, paragraph=False, min_size=1, text_threshold=0.0, low_text=0.0
        )
        return " ".join(t for _, t, _ in res if t.strip()) if res else ""
    except:
        return ""


def extract_num(text):
    digits = re.findall(r"\d+", text)
    return int(digits[0]) if digits else None


# Test frames from recordings
recordings = [
    "examples/recordings/derived/screen-recording-20260322/frames",
    "examples/recordings/derived/screen-recording-20260323/frames",
]

# Different ROI candidates to test
ROI_CANDIDATES = [
    # Format: (roi, description)
    ((385, 160, 25, 20), "Original (25x20)"),
    ((375, 155, 35, 30), "Enlarged (35x30)"),
    ((365, 150, 45, 35), "Wider (45x35)"),
    ((380, 155, 30, 25), "Medium (30x25)"),
    ((370, 152, 40, 28), "Custom (40x28)"),
    ((385, 158, 22, 18), "Tight (22x18)"),
]

# Test on multiple frames
results = {desc: {"correct": 0, "total": 0} for _, desc in ROI_CANDIDATES}

for frames_dir in recordings:
    if not os.path.exists(frames_dir):
        continue

    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])

    # Test frames where shop is likely visible (stage 2+)
    test_frames = frames[::20][:5]  # Sample 5 frames

    for frame_file in test_frames:
        img = cv2.imread(os.path.join(frames_dir, frame_file))
        if img is None:
            continue

        # Check if stage is visible and >= 2
        stage_roi = (370, 8, 160, 25)
        stage_text = ocr(img, stage_roi, "orig")
        cleaned = "".join(c for c in stage_text if c.isdigit() or c == "-")
        match = re.search(r"(\d)-(\d)", cleaned)

        if not match:
            continue

        stage_num = int(match.group(1))
        if stage_num < 2:
            continue  # Shop not visible in stage 1

        # Test each ROI candidate
        for roi, desc in ROI_CANDIDATES:
            results[desc]["total"] += 1

            # Try multiple strategies
            for strategy in ["orig", "otsu", "high", "inv"]:
                text = ocr(img, roi, strategy)
                num = extract_num(text)
                if num is not None and 1 <= num <= 5:
                    results[desc]["correct"] += 1
                    break

# Print results
print(f"\n{'ROI Description':<25} {'Correct':<10} {'Total':<10} {'Accuracy':<12}")
print("-" * 60)

for desc, data in sorted(
    results.items(), key=lambda x: x[1]["correct"] / max(x[1]["total"], 1), reverse=True
):
    if data["total"] > 0:
        acc = data["correct"] / data["total"] * 100
        status = "✅" if acc >= 95 else ("⚠️" if acc >= 70 else "❌")
        print(
            f"{desc:<25} {data['correct']:<10} {data['total']:<10} {acc:.1f}% {status}"
        )

# Test on specific frame to visualize
print("\n" + "=" * 60)
print("DETAILED TEST - Single Frame")
print("=" * 60)

test_frame = (
    "examples/recordings/derived/screen-recording-20260323/frames/frame_0080.jpg"
)
if os.path.exists(test_frame):
    img = cv2.imread(test_frame)
    print(f"\nTesting: {test_frame}")
    print(f"\nROI (x, y, w, h) | Strategy | Raw OCR | Number")
    print("-" * 60)

    for roi, desc in ROI_CANDIDATES:
        print(f"\n{desc}: {roi}")
        for strategy in ["orig", "otsu", "high", "inv"]:
            text = ocr(img, roi, strategy)
            num = extract_num(text)
            valid = "✓" if num is not None and 1 <= num <= 5 else "✗"
            print(f"  {strategy:<8} | '{text}' | {num} {valid}")
