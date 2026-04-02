#!/usr/bin/env python3
"""
Focused OCR test - only tests frames with visible game UI
"""

import cv2
import easyocr
import numpy as np
import re
import os
import json
from collections import Counter
import time

print("=" * 60)
print("FOCUSED OCR TEST - GAME UI FRAMES ONLY")
print("=" * 60)

# Initialize EasyOCR
print("\nInitializing EasyOCR...")
READER = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)
print("EasyOCR ready\n")

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


def ocr_multi(img, roi, strategies=["original", "otsu", "high", "inv"]):
    results = []
    for strategy in strategies:
        text = ocr_strategy(img, roi, strategy)
        if text:
            results.append((text, strategy))

    if not results:
        return "", 0, "none"

    texts = [r[0] for r in results]
    best_text = Counter(texts).most_common(1)[0][0]
    best_strategy = next(s for t, s in results if t == best_text)
    return best_text, 0.5, best_strategy


# ROI definitions
STAGE_ROI = (370, 8, 160, 25)
GOLD_ROIS = [(940, 415, 70, 45), (950, 420, 60, 40), (930, 410, 80, 50)]
LEVEL_ROIS = [(115, 440, 40, 35), (110, 435, 50, 45), (120, 445, 30, 30)]
HP_ROIS = [
    (930, 70, 55, 30),
    (930, 110, 55, 30),
    (930, 150, 55, 30),
    (930, 190, 55, 30),
    (930, 230, 55, 30),
    (930, 270, 55, 30),
    (930, 310, 55, 30),
    (930, 350, 55, 30),
]
SHOP_NAME_ROIS = [
    (270, 160, 100, 25),
    (410, 160, 110, 25),
    (560, 160, 100, 25),
    (710, 160, 100, 25),
    (860, 160, 100, 25),
]
SHOP_COST_ROIS = [
    (375, 155, 35, 30),
    (525, 155, 35, 30),
    (675, 155, 35, 30),
    (825, 155, 35, 30),
    (975, 155, 35, 30),
]


def test_stage(img):
    text, _, _ = ocr_multi(img, STAGE_ROI)
    cleaned = "".join(c for c in correct(text) if c.isdigit() or c == "-")
    cleaned = cleaned.replace("—", "-").replace("–", "-")
    match = re.search(r"(\d)-(\d)", cleaned)
    if match:
        s, r = int(match.group(1)), int(match.group(2))
        if 1 <= s <= 7 and 1 <= r <= 7:
            return True, f"{s}-{r}"
    return False, None


def test_gold(img):
    for roi in GOLD_ROIS:
        for strategy in ["high", "original", "inv", "otsu"]:
            text = ocr_strategy(img, roi, strategy)
            num = extract_num(text)
            if num is not None and 0 <= num <= 100:
                return True, num, strategy
    return False, None, "none"


def test_level(img):
    for roi in LEVEL_ROIS:
        for strategy in ["inv", "original", "high", "otsu"]:
            text = ocr_strategy(img, roi, strategy)
            num = extract_num(text)
            if num is not None and 1 <= num <= 10:
                return True, num, strategy
    return False, None, "none"


def test_hp(img):
    for roi in HP_ROIS:
        for strategy in ["original", "high", "inv", "otsu"]:
            text = ocr_strategy(img, roi, strategy)
            num = extract_num(text)
            if num is not None and 50 <= num <= 100:
                return True, num, strategy
    return False, None, "none"


def test_shop(img):
    names = []
    costs = []

    for i in range(5):
        name = None
        for strategy in ["original", "otsu", "high"]:
            text = ocr_strategy(img, SHOP_NAME_ROIS[i], strategy)
            name = extract_name(text)
            if name:
                break
        names.append(name)

        cost = None
        for strategy in ["original", "otsu", "high", "inv"]:
            text = ocr_strategy(img, SHOP_COST_ROIS[i], strategy)
            cost = extract_num(text)
            if cost is not None and 1 <= cost <= 5:
                break
        costs.append(cost)

    return names, costs


# Test recordings
recordings = [
    "examples/recordings/derived/screen-recording-20260322/frames",
    "examples/recordings/derived/screen-recording-20260323/frames",
    "examples/recordings/derived/screen-recording-20260323-2/frames",
    "examples/recordings/derived/screen-recording-20260323-3/frames",
    "examples/recordings/derived/screen-recording-20260324/frames",
]

all_results = {
    "stage": [],
    "gold": [],
    "level": [],
    "hp": [],
    "shop_names": [],
    "shop_costs": [],
}
stage_values = []
gold_values = []
level_values = []
hp_values = []

print("\n" + "=" * 60)
print("TESTING ALL RECORDINGS")
print("=" * 60)

start_time = time.time()
game_frames_tested = 0

for frames_dir in recordings:
    if not os.path.exists(frames_dir):
        continue

    rec_name = os.path.basename(os.path.dirname(frames_dir))
    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])

    # Test every 10th frame to speed up
    sampled = frames[::10]
    print(f"\n{rec_name}: {len(sampled)} frames sampled")

    game_frames = 0
    for frame_file in sampled:
        img = cv2.imread(os.path.join(frames_dir, frame_file))
        if img is None:
            continue

        # Stage detection
        has_stage, stage_val = test_stage(img)
        all_results["stage"].append(has_stage)

        if not has_stage:
            continue  # Skip frames without game UI

        game_frames += 1
        game_frames_tested += 1

        if stage_val:
            stage_values.append(stage_val)

        # Gold
        gold_ok, gold_val, _ = test_gold(img)
        all_results["gold"].append(gold_ok)
        if gold_ok:
            gold_values.append(gold_val)

        # Level
        level_ok, level_val, _ = test_level(img)
        all_results["level"].append(level_ok)
        if level_ok:
            level_values.append(level_val)

        # HP
        hp_ok, hp_val, _ = test_hp(img)
        all_results["hp"].append(hp_ok)
        if hp_ok:
            hp_values.append(hp_val)

        # Shop (only for stage 2+)
        if stage_val:
            stage_match = re.match(r"(\d)-(\d)", stage_val)
            if stage_match and int(stage_match.group(1)) >= 2:
                names, costs = test_shop(img)
                for name in names:
                    all_results["shop_names"].append(name is not None)
                for cost in costs:
                    all_results["shop_costs"].append(
                        cost is not None and 1 <= cost <= 5
                    )

    print(f"  Game frames found: {game_frames}")

elapsed = time.time() - start_time

# Final summary
print("\n" + "=" * 60)
print("RESULTS (GAME UI FRAMES ONLY)")
print("=" * 60)

print(f"\nTotal frames sampled: {sum(len(v) for v in all_results['stage'][:1])}")
print(f"Game frames tested: {game_frames_tested}")
print(f"Processing time: {elapsed:.1f}s")

print(f"\n{'Element':<15} {'Correct':<10} {'Total':<10} {'Accuracy':<12}")
print("-" * 50)

for elem in ["stage", "gold", "level", "hp", "shop_names", "shop_costs"]:
    if len(all_results[elem]) > 0:
        correct = sum(all_results[elem])
        total = len(all_results[elem])
        acc = correct / total * 100 if total > 0 else 0
        status = "✅" if acc >= 95 else ("⚠️" if acc >= 70 else "❌")
        print(f"{elem:<15} {correct:<10} {total:<10} {acc:.1f}% {status}")

print(f"\nStage values found: {sorted(set(stage_values))}")
print(f"Gold values: {sorted(set(gold_values))[:10]}")
print(f"Level values: {sorted(set(level_values))}")
print(f"HP values: {sorted(set(hp_values))[:10]}")

# Save results
with open("examples/focused-ocr-results.json", "w") as f:
    json.dump(
        {
            "results": {
                k: {"correct": sum(v), "total": len(v)} for k, v in all_results.items()
            },
            "stage_values": sorted(set(stage_values)),
            "gold_values": sorted(set(gold_values)),
            "level_values": sorted(set(level_values)),
            "hp_values": sorted(set(hp_values)),
            "game_frames_tested": game_frames_tested,
            "processing_time": elapsed,
        },
        f,
        indent=2,
    )

print(f"\nResults saved to examples/focused-ocr-results.json")
