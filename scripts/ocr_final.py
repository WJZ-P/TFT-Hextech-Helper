#!/usr/bin/env python3
"""
Final Improved OCR for TFT Multi-Element Recognition
Uses multiple preprocessing strategies and voting for best results
"""

import cv2
import easyocr
import numpy as np
import re
import os
import json
from pathlib import Path
from collections import Counter

print("=" * 80)
print("TFT FINAL OCR SYSTEM")
print("=" * 80)

# Initialize EasyOCR
print("\nInitializing EasyOCR...")
READER = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)
print("EasyOCR ready\n")

# ==================== CHARACTER CORRECTIONS ====================

CHINESE_CORRECTIONS = {
    "声": "萨",
    "萑": "崔",
    "左": "佐",
    "斤": "斯",
    "产": "萨",
    "霾": "蔚",
    "霾": "蔚",
    "仔": "伊",
}

NUMBER_CORRECTIONS = {
    "O": "0",
    "o": "0",
    "l": "1",
    "I": "1",
    "|": "1",
    "S": "5",
    "s": "5",
    "B": "8",
    "{": "8",
    "}": "3",
    "!": "1",
}


def correct_chinese(text):
    if not text:
        return text
    result = text
    for wrong, correct in CHINESE_CORRECTIONS.items():
        result = result.replace(wrong, correct)
    return result


def correct_number(text):
    if not text:
        return text
    result = text
    for wrong, correct in NUMBER_CORRECTIONS.items():
        result = result.replace(wrong, correct)
    return result


def extract_number(text):
    if not text:
        return None
    corrected = correct_number(text)
    digits = re.findall(r"\d+", corrected)
    return int(digits[0]) if digits else None


def extract_champion_name(text):
    if not text:
        return None
    corrected = correct_chinese(text)
    chinese_chars = "".join(c for c in corrected if "\u4e00" <= c <= "\u9fff")
    if len(chinese_chars) >= 2:
        return chinese_chars
    return corrected.strip() if corrected.strip() else None


# ==================== MULTI-STRATEGY OCR ====================


def ocr_multi_strategy(img, roi, strategies=None):
    """
    Try multiple preprocessing strategies and return the best result
    Uses voting to select the most common result
    """
    x, y, w, h = roi

    # Bounds checking
    img_h, img_w = img.shape[:2]
    if x >= img_w or y >= img_h:
        return "", 0, "none"

    x = max(0, x)
    y = max(0, y)
    w = min(w, img_w - x)
    h = min(h, img_h - y)

    if w <= 2 or h <= 2:
        return "", 0, "none"

    crop = img[y : y + h, x : x + w]
    if crop.size == 0:
        return "", 0, "none"

    if strategies is None:
        strategies = ["original", "otsu", "high", "inv"]

    all_results = []

    for strategy in strategies:
        try:
            if strategy == "original":
                rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            elif strategy == "otsu":
                gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                _, binary = cv2.threshold(
                    gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
                )
                rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
            elif strategy == "high":
                gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                _, binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
                rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
            elif strategy == "inv":
                gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                _, binary = cv2.threshold(
                    gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
                )
                rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
            elif strategy == "adaptive":
                gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                binary = cv2.adaptiveThreshold(
                    gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
                )
                rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
            else:
                continue

            results = READER.readtext(
                rgb, paragraph=False, min_size=1, text_threshold=0.1, low_text=0.1
            )

            texts = [t for _, t, _ in results if t.strip()]
            confidences = [c for _, _, c in results]

            if texts:
                combined = " ".join(texts)
                avg_conf = sum(confidences) / len(confidences)
                all_results.append((combined, avg_conf, strategy))

        except Exception:
            continue

    if not all_results:
        return "", 0, "none"

    # Vote for the most common result
    texts = [r[0] for r in all_results]
    text_counts = Counter(texts)
    best_text = text_counts.most_common(1)[0][0]

    # Get the confidence for the winning text
    matching_results = [r for r in all_results if r[0] == best_text]
    avg_conf = sum(r[1] for r in matching_results) / len(matching_results)
    best_strategy = matching_results[0][2]

    return best_text, avg_conf, best_strategy


# ==================== ROI DEFINITIONS ====================

STAGE_ROI = (370, 8, 160, 25)
GOLD_ROI = (950, 415, 50, 45)
LEVEL_ROI = (115, 440, 40, 35)
XP_ROI = (20, 395, 100, 25)
HP_ROIS = [
    (940, 65, 45, 25),
    (940, 105, 45, 25),
    (940, 145, 45, 25),
    (940, 185, 45, 25),
]

# Shop card boundaries: 264-396, 401-547, 554-692, 702-840, 855-1040
SHOP_NAME_ROIS = [
    (270, 160, 100, 25),
    (410, 160, 110, 25),
    (560, 160, 100, 25),
    (710, 160, 100, 25),
    (860, 160, 100, 25),
]

SHOP_COST_ROIS = [
    (365, 158, 35, 25),
    (515, 158, 35, 25),
    (660, 158, 35, 25),
    (810, 158, 35, 25),
    (1000, 158, 35, 25),
]

BENCH_ROIS = [
    (180, 280, 80, 60),
    (280, 280, 80, 60),
    (380, 280, 80, 60),
    (480, 280, 80, 60),
    (580, 280, 80, 60),
    (680, 280, 80, 60),
    (780, 280, 80, 60),
]

EQUIPMENT_ROIS = [
    (32, 24, 57, 57),
    (32, 71, 57, 57),
    (32, 117, 57, 57),
    (32, 163, 57, 57),
    (32, 209, 57, 57),
]


# ==================== TEST FUNCTIONS ====================


def test_stage(img):
    text, conf, method = ocr_multi_strategy(img, STAGE_ROI)
    cleaned = correct_number(text).replace("—", "-").replace("–", "-")
    cleaned = "".join(c for c in cleaned if c.isdigit() or c == "-")
    match = re.search(r"(\d)-(\d)", cleaned)
    if match:
        s, r = int(match.group(1)), int(match.group(2))
        if 1 <= s <= 7 and 1 <= r <= 7:
            return True, f"{s}-{r}", conf
    return False, None, conf


def test_gold(img):
    # Try multiple strategies optimized for gold (white number on gold circle)
    strategies = ["high", "otsu", "inv", "original"]
    for strategy in strategies:
        text, conf, method = ocr_multi_strategy(img, GOLD_ROI, [strategy])
        number = extract_number(text)
        if number is not None and 0 <= number <= 100:
            return True, number, conf, method
    return False, None, 0, "none"


def test_level(img):
    # Try multiple strategies for level (white number in dark circle)
    strategies = ["high", "inv", "otsu", "original"]
    for strategy in strategies:
        text, conf, method = ocr_multi_strategy(img, LEVEL_ROI, [strategy])
        number = extract_number(text)
        if number is not None and 1 <= number <= 10:
            return True, number, conf, method
    return False, None, 0, "none"


def test_hp(img):
    # Scan multiple positions
    for hp_roi in HP_ROIS:
        strategies = ["original", "inv", "otsu"]
        for strategy in strategies:
            text, conf, method = ocr_multi_strategy(img, hp_roi, [strategy])
            number = extract_number(text)
            if number is not None and 50 <= number <= 100:
                return True, number, conf, f"{method}@{hp_roi}"
    return False, None, 0, "none"


def test_shop(img):
    results = []

    for i in range(5):
        # Name
        name_text, name_conf, name_method = ocr_multi_strategy(img, SHOP_NAME_ROIS[i])
        name = extract_champion_name(name_text)

        # Cost
        cost_text, cost_conf, cost_method = ocr_multi_strategy(img, SHOP_COST_ROIS[i])
        cost = extract_number(cost_text)

        results.append(
            {
                "slot": i + 1,
                "name": name,
                "cost": cost,
                "name_confidence": name_conf,
                "cost_confidence": cost_conf,
            }
        )

    return results


def test_bench(img):
    results = []
    for i, roi in enumerate(BENCH_ROIS):
        text, conf, method = ocr_multi_strategy(img, roi)
        name = extract_champion_name(text)
        if name:
            results.append({"position": i, "name": name, "confidence": conf})
    return results


def test_equipment(img):
    results = []
    for i, roi in enumerate(EQUIPMENT_ROIS):
        x, y, w, h = roi
        if x + w <= img.shape[1] and y + h <= img.shape[0]:
            crop = img[y : y + h, x : x + w]
            if crop.size > 0:
                gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                std_val = np.std(gray)
                has_item = std_val > 25
                results.append(
                    {"slot": i + 1, "has_item": has_item, "variance": std_val}
                )
    return results


def has_game_ui(img):
    text, conf, _ = ocr_multi_strategy(img, STAGE_ROI)
    cleaned = correct_number(text)
    return re.search(r"(\d)-(\d)", cleaned) is not None


# ==================== MAIN TEST ====================


def run_full_test(frames_dir, max_frames=15):
    if not os.path.exists(frames_dir):
        print(f"Directory not found: {frames_dir}")
        return None

    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])[
        :max_frames
    ]

    print(f"\nTesting {len(frames)} frames from {os.path.basename(frames_dir)}")
    print("-" * 60)

    stats = {
        "stage": {"detected": 0, "total": 0},
        "gold": {"detected": 0, "total": 0},
        "level": {"detected": 0, "total": 0},
        "hp": {"detected": 0, "total": 0},
        "shop_names": {"detected": 0, "total": 0},
        "shop_costs": {"detected": 0, "total": 0},
        "bench_champs": {"detected": 0, "total": 0},
        "equipment": {"has_items": 0, "total": 0},
    }

    samples = []

    for frame in frames:
        img = cv2.imread(os.path.join(frames_dir, frame))
        if img is None:
            continue

        if not has_game_ui(img):
            continue

        # Test all elements
        stage_ok, stage_val, stage_conf = test_stage(img)
        gold_ok, gold_val, gold_conf, gold_method = test_gold(img)
        level_ok, level_val, level_conf, level_method = test_level(img)
        hp_ok, hp_val, hp_conf, hp_method = test_hp(img)
        shop_results = test_shop(img)
        bench_results = test_bench(img)
        equip_results = test_equipment(img)

        # Update stats
        stats["stage"]["total"] += 1
        if stage_ok:
            stats["stage"]["detected"] += 1

        stats["gold"]["total"] += 1
        if gold_ok:
            stats["gold"]["detected"] += 1

        stats["level"]["total"] += 1
        if level_ok:
            stats["level"]["detected"] += 1

        stats["hp"]["total"] += 1
        if hp_ok:
            stats["hp"]["detected"] += 1

        for card in shop_results:
            stats["shop_names"]["total"] += 1
            if card["name"]:
                stats["shop_names"]["detected"] += 1
            stats["shop_costs"]["total"] += 1
            if card["cost"] is not None:
                stats["shop_costs"]["detected"] += 1

        for champ in bench_results:
            stats["bench_champs"]["total"] += 1
            if champ["name"]:
                stats["bench_champs"]["detected"] += 1

        for equip in equip_results:
            stats["equipment"]["total"] += 1
            if equip["has_item"]:
                stats["equipment"]["has_items"] += 1

        # Save samples
        if len(samples) < 3:
            samples.append(
                {
                    "frame": frame,
                    "stage": {"detected": stage_ok, "value": stage_val},
                    "gold": {
                        "detected": gold_ok,
                        "value": gold_val,
                        "method": gold_method,
                    },
                    "level": {
                        "detected": level_ok,
                        "value": level_val,
                        "method": level_method,
                    },
                    "hp": {"detected": hp_ok, "value": hp_val},
                    "shop_sample": shop_results[:2],
                }
            )

    # Print results
    print("\n" + "=" * 70)
    print("FINAL OCR RESULTS")
    print("=" * 70)

    print(f"\n{'Element':<20} {'Detected':<12} {'Total':<10} {'Accuracy':<12}")
    print("-" * 70)

    for element, data in stats.items():
        if data["total"] > 0:
            detected = data.get("detected", data.get("has_items", 0))
            acc = detected / data["total"] * 100
            status = "✅" if acc >= 95 else ("⚠️" if acc >= 70 else "❌")
            print(
                f"{element:<20} {detected:<12} {data['total']:<10} {acc:.1f}% {status}"
            )
        else:
            print(f"{element:<20} {'N/A':<12} {data['total']:<10} {'N/A':<12}")

    # Print samples
    print("\n" + "=" * 70)
    print("SAMPLE RESULTS")
    print("=" * 70)

    for s in samples[:2]:
        print(f"\nFrame: {s['frame']}")
        print(f"  Stage: {s['stage']['value']}")
        print(f"  Gold: {s['gold']['value']} (method: {s['gold']['method']})")
        print(f"  Level: {s['level']['value']} (method: {s['level']['method']})")
        print(f"  HP: {s['hp']['value']}")
        shop = [(c["name"], c["cost"]) for c in s["shop_sample"] if c["name"]]
        print(f"  Shop: {shop}")

    return stats


def main():
    recordings = [
        "examples/recordings/derived/screen-recording-20260322/frames",
        "examples/recordings/derived/screen-recording-20260323-3/frames",
        "examples/recordings/derived/screen-recording-20260324/frames",
    ]

    all_stats = {}

    for frames_dir in recordings:
        if os.path.exists(frames_dir):
            stats = run_full_test(frames_dir, max_frames=12)
            if stats:
                all_stats[os.path.basename(frames_dir)] = stats

    # Save results
    with open("examples/final-ocr-results.json", "w") as f:
        json.dump(all_stats, f, indent=2)

    # Summary
    print("\n" + "=" * 70)
    print("OVERALL SUMMARY")
    print("=" * 70)

    totals = {}
    for rec_name, stats in all_stats.items():
        for elem, data in stats.items():
            if elem not in totals:
                totals[elem] = {"detected": 0, "total": 0}
            totals[elem]["detected"] += data.get("detected", data.get("has_items", 0))
            totals[elem]["total"] += data["total"]

    print(f"\n{'Element':<20} {'Detected':<12} {'Total':<10} {'Accuracy':<12}")
    print("-" * 70)

    for element, data in totals.items():
        if data["total"] > 0:
            acc = data["detected"] / data["total"] * 100
            status = "✅" if acc >= 95 else ("⚠️" if acc >= 70 else "❌")
            print(
                f"{element:<20} {data['detected']:<12} {data['total']:<10} {acc:.1f}% {status}"
            )

    print("\nResults saved to examples/final-ocr-results.json")


if __name__ == "__main__":
    main()
