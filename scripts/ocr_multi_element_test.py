#!/usr/bin/env python3
"""
Multi-Element OCR Test for TFT
Tests: Stage, Champions, Items, HUD Numbers (Gold/XP/HP), Shop Cards
"""

import cv2
import easyocr
import numpy as np
import os
import re
import json
import time
from pathlib import Path

print("=" * 80)
print("TFT MULTI-ELEMENT OCR TEST")
print("=" * 80)

# Initialize EasyOCR
print("\nInitializing EasyOCR...")
READER = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)
print("EasyOCR ready\n")

# ==================== ROI DEFINITIONS ====================
# Android mobile layout for 1040x480 resolution
# Calibrated from frame_0101.jpg and multiple frames

# Stage indicator (top center)
STAGE_ROI = (370, 8, 160, 25)  # x, y, w, h

# Gold display - bottom right, gold coin with number
GOLD_ROI = (950, 415, 50, 45)  # Gold amount (e.g., "55")

# Level display - bottom left, shows level number with icon
LEVEL_ROI = (70, 430, 60, 35)  # Level number (e.g., "4")

# XP display - text above level showing XP progress
XP_ROI = (20, 395, 100, 25)  # XP text (e.g., "2/20" or "购买经验值")

# HP - player health from right sidebar (HP numbers are at right edge of each row)
HP_ROI = (940, 65, 45, 25)  # Player 1 HP (95)

# Shop slots - TOP row of 5 champion cards (visible during planning phase)
# Each card has: champion image, name, cost
SHOP_SLOT_ROIS = [
    # Slot 1: 萨勒芬妮 (Seraphine) - 4 cost
    (245, 15, 170, 125),  # x, y, w, h - includes name and cost
    # Slot 2: 斯维因 (Swain) - 4 cost
    (420, 15, 170, 125),
    # Slot 3: 崔斯特 (Twisted Fate) - 2 cost
    (595, 15, 170, 125),
    # Slot 4: 蔚 (Vi) - 2 cost
    (770, 15, 170, 125),
    # Slot 5: 佐伊 (Zoe) - 3 cost
    (945, 15, 170, 125),
]

# Shop name regions - champion names at the bottom of each card
# Card boundaries: 264-396, 401-547, 554-692, 702-840, 855-1040
SHOP_NAME_ROIS = [
    (270, 160, 100, 25),  # Slot 1: 萨勒芬妮 (centered in 264-396)
    (410, 160, 110, 25),  # Slot 2: 斯维因 (centered in 401-547)
    (560, 160, 100, 25),  # Slot 3: 崔斯特 (centered in 554-692)
    (710, 160, 100, 25),  # Slot 4: 蔚 (centered in 702-840)
    (860, 160, 100, 25),  # Slot 5: 佐伊 (centered in 855-1040)
]

# Shop cost regions - cost numbers at right edge of each card
SHOP_COST_ROIS = [
    (365, 160, 35, 25),  # Slot 1 cost: 4 (right edge of 264-396)
    (515, 160, 35, 25),  # Slot 2 cost: 4 (right edge of 401-547)
    (660, 160, 35, 25),  # Slot 3 cost: 2 (right edge of 554-692)
    (810, 160, 35, 25),  # Slot 4 cost: 2 (right edge of 702-840)
    (1000, 160, 35, 25),  # Slot 5 cost: 3 (right edge of 855-1040)
]

# Shop cost regions - cost numbers next to names
SHOP_COST_ROIS = [
    (355, 160, 40, 25),  # Slot 1 cost: 4
    (515, 160, 40, 25),  # Slot 2 cost: 4
    (675, 160, 40, 25),  # Slot 3 cost: 2
    (840, 160, 40, 25),  # Slot 4 cost: 2
    (980, 160, 40, 25),  # Slot 5 cost: 3
]

# Shop cost regions - cost numbers with coin icon at right edge
SHOP_COST_ROIS = [
    (350, 160, 40, 25),  # Slot 1 cost: 4
    (520, 160, 40, 25),  # Slot 2 cost: 4
    (690, 160, 40, 25),  # Slot 3 cost: 2
    (850, 160, 40, 25),  # Slot 4 cost: 2
    (1010, 160, 35, 25),  # Slot 5 cost: 3
]

# Shop cost regions - cost numbers next to names
SHOP_COST_ROIS = [
    (365, 160, 30, 25),  # Slot 1 cost: 4
    (540, 160, 30, 25),  # Slot 2 cost: 4
    (715, 160, 30, 25),  # Slot 3 cost: 2
    (870, 160, 30, 25),  # Slot 4 cost: 2
    (1035, 160, 30, 25),  # Slot 5 cost: 3
]

# Shop cost regions (just the cost number)
SHOP_COST_ROIS = [
    (370, 115, 30, 20),  # Slot 1 cost
    (545, 115, 30, 20),  # Slot 2 cost
    (720, 115, 30, 20),  # Slot 3 cost
    (895, 115, 30, 20),  # Slot 4 cost
    (1055, 115, 30, 20),  # Slot 5 cost (may be cut off)
]

# Bench slots - champion bench (where purchased champions sit)
# Bench is visible in the middle area of the screen
BENCH_ROIS = [
    (180, 280, 80, 60),  # SLOT_1
    (280, 280, 80, 60),  # SLOT_2
    (380, 280, 80, 60),  # SLOT_3
    (480, 280, 80, 60),  # SLOT_4
    (580, 280, 80, 60),  # SLOT_5
    (680, 280, 80, 60),  # SLOT_6
    (780, 280, 80, 60),  # SLOT_7
]

# Equipment slots - Android left side equipment bar
# Based on androidEquipmentRegion in TFTProtocol.ts (percentage coords)
# Converted to 1040x480 pixels
EQUIPMENT_ROIS = [
    (32, 24, 57, 57),  # SLOT_1: (0.0305, 0.0510) to (0.0851, 0.1700)
    (32, 71, 57, 57),  # SLOT_2: (0.0305, 0.1470) to (0.0851, 0.2660)
    (32, 117, 57, 57),  # SLOT_3: (0.0305, 0.2430) to (0.0851, 0.3620)
    (32, 163, 57, 57),  # SLOT_4: (0.0305, 0.3390) to (0.0851, 0.4580)
    (32, 209, 57, 57),  # SLOT_5: (0.0305, 0.4360) to (0.0851, 0.5548)
]

# Bench slots - champion bench (where purchased champions sit)
BENCH_ROIS = [
    (200, 240, 60, 50),  # SLOT_1
    (265, 240, 60, 50),  # SLOT_2
    (330, 240, 60, 50),  # SLOT_3
    (395, 240, 60, 50),  # SLOT_4
    (460, 240, 60, 50),  # SLOT_5
    (525, 240, 60, 50),  # SLOT_6
    (590, 240, 60, 50),  # SLOT_7
    (655, 240, 60, 50),  # SLOT_8
    (720, 240, 60, 50),  # SLOT_9
]

# Bench slots - champion bench above the shop
BENCH_ROIS = [
    (100, 250, 70, 70),  # SLOT_1
    (185, 250, 70, 70),  # SLOT_2
    (270, 250, 70, 70),  # SLOT_3
    (355, 250, 70, 70),  # SLOT_4
    (440, 250, 70, 70),  # SLOT_5
    (525, 250, 70, 70),  # SLOT_6
    (610, 250, 70, 70),  # SLOT_7
    (695, 250, 70, 70),  # SLOT_8
    (780, 250, 70, 70),  # SLOT_9
]

# Bench slots - benchSlotRegion (percentage coordinates)
# SLOT_1: leftTop (0.1074, 0.6719) = (112, 323), rightBottom (0.1514, 0.7617) = (157, 366)
# SLOT_9: leftTop (0.7715, 0.6719) = (802, 323), rightBottom (0.8105, 0.7617) = (843, 366)
BENCH_ROIS = [
    (112, 323, 45, 43),  # SLOT_1
    (185, 323, 45, 43),  # SLOT_2
    (255, 323, 45, 43),  # SLOT_3
    (340, 323, 45, 43),  # SLOT_4
    (423, 323, 45, 43),  # SLOT_5
    (510, 323, 45, 43),  # SLOT_6
    (595, 323, 45, 43),  # SLOT_7
    (675, 323, 45, 43),  # SLOT_8
    (775, 323, 45, 43),  # SLOT_9
]


# ==================== OCR FUNCTIONS ====================


def extract_stage(text):
    """Extract stage text (X-Y format)"""
    if not text:
        return None
    cleaned = "".join(c for c in text if not ("\u4e00" <= c <= "\u9fff"))
    cleaned = cleaned.replace("—", "-").replace("–", "-")
    cleaned = "".join(c for c in cleaned if c.isdigit() or c == "-")
    match = re.search(r"(\d)-(\d)", cleaned)
    if match and 1 <= int(match.group(1)) <= 7 and 1 <= int(match.group(2)) <= 7:
        return match.group(0)
    digits = re.findall(r"\d", cleaned)
    if len(digits) >= 2:
        s, r = int(digits[0]), int(digits[1])
        if 1 <= s <= 7 and 1 <= r <= 7:
            return f"{s}-{r}"
    return None


def extract_number(text):
    """Extract number from OCR text"""
    if not text:
        return None
    digits = re.findall(
        r"\d+", text.replace("O", "0").replace("l", "1").replace("I", "1")
    )
    if digits:
        return int(digits[0])
    return None


def extract_champion_name(text):
    """Extract champion name from OCR text (Chinese)"""
    if not text:
        return None
    # Remove numbers and special chars, keep Chinese
    chinese_chars = "".join(c for c in text if "\u4e00" <= c <= "\u9fff")
    if len(chinese_chars) >= 2:
        return chinese_chars
    return text.strip() if text.strip() else None


def ocr_region(img, roi, preprocess="auto"):
    """OCR a specific region with preprocessing"""
    x, y, w, h = roi
    crop = img[y : y + h, x : x + w]

    if crop.size == 0:
        return "", 0

    # Preprocessing
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    if preprocess == "auto":
        # Use Otsu threshold for better text detection
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
    elif preprocess == "inverted":
        # Invert for white text on dark background
        _, binary = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)
        rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
    elif preprocess == "grayscale":
        norm = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
        rgb = cv2.cvtColor(norm, cv2.COLOR_GRAY2RGB)
    elif preprocess == "cost":
        # For cost numbers - use original RGB with low thresholds
        rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    else:
        rgb = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)

    # Use different settings for cost detection
    if preprocess == "cost":
        results = READER.readtext(
            rgb, paragraph=False, min_size=1, text_threshold=0.1, low_text=0.1
        )
    else:
        results = READER.readtext(
            rgb, paragraph=False, min_size=3, text_threshold=0.2, low_text=0.1
        )

    texts = [t for _, t, _ in results if t.strip()]
    confidences = [c for _, _, c in results]

    combined_text = " ".join(texts)
    avg_conf = sum(confidences) / len(confidences) if confidences else 0

    return combined_text, avg_conf


def detect_star_level(crop):
    """Detect star level from color (1★=silver, 2★=gold, 3★=purple)"""
    if crop.size == 0:
        return 0

    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)

    # Count bright pixels (stars are typically bright)
    bright_pixels = np.sum(hsv[:, :, 2] > 200)
    total_pixels = crop.shape[0] * crop.shape[1]

    bright_ratio = bright_pixels / total_pixels if total_pixels > 0 else 0

    if bright_ratio > 0.3:
        return 3
    elif bright_ratio > 0.15:
        return 2
    elif bright_ratio > 0.05:
        return 1
    return 0


def has_game_ui(img):
    """Check if frame has game UI (not loading/banner)"""
    # Check for stage indicator
    text, conf = ocr_region(img, STAGE_ROI)
    stage = extract_stage(text)
    return stage is not None


def detect_item_in_slot(img, roi):
    """Detect if an item exists in an equipment slot using color variance"""
    x, y, w, h = roi
    crop = img[y : y + h, x : x + w]

    if crop.size == 0:
        return False, 0

    # Convert to grayscale and check variance
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    std_val = np.std(gray)

    # Items have more color variance than empty slots
    # Empty slots are typically dark/uniform
    has_item = std_val > 25

    return has_item, std_val


# ==================== TEST FUNCTIONS ====================


def test_stage_recognition(img):
    """Test stage recognition"""
    text, conf = ocr_region(img, STAGE_ROI)
    stage = extract_stage(text)
    return {"detected": stage is not None, "value": stage, "confidence": conf}


def test_hud_numbers(img):
    """Test HUD number recognition (gold, level, XP, HP)"""
    results = {}

    # Gold
    text, conf = ocr_region(img, GOLD_ROI)
    number = extract_number(text)
    results["gold"] = {
        "detected": number is not None,
        "value": number,
        "confidence": conf,
    }

    # Level
    text, conf = ocr_region(img, LEVEL_ROI)
    number = extract_number(text)
    results["level"] = {
        "detected": number is not None,
        "value": number,
        "confidence": conf,
    }

    # XP
    text, conf = ocr_region(img, XP_ROI)
    results["xp"] = {
        "detected": text.strip() != "",
        "value": text.strip(),
        "confidence": conf,
    }

    # HP (from sidebar)
    text, conf = ocr_region(img, HP_ROI)
    number = extract_number(text)
    results["hp"] = {
        "detected": number is not None,
        "value": number,
        "confidence": conf,
    }

    return results


def test_shop_cards(img):
    """Test shop card recognition (names and costs)"""
    results = []

    for i in range(5):
        # Get name from name ROI
        name_roi = SHOP_NAME_ROIS[i]
        name_text, name_conf = ocr_region(img, name_roi, preprocess="grayscale")
        name = extract_champion_name(name_text)

        # Get cost from cost ROI - use cost preprocessing
        cost_roi = SHOP_COST_ROIS[i]
        cost_text, cost_conf = ocr_region(img, cost_roi, preprocess="cost")
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


def test_board_bench(img):
    """Test board/bench recognition (champion detection)"""
    results = []

    for i, roi in enumerate(BENCH_ROIS):
        text, conf = ocr_region(img, roi)
        name = extract_champion_name(text)

        if name:
            results.append({"position": i, "name": name, "confidence": conf})

    return results


def test_equipment(img):
    """Test equipment slot recognition"""
    results = []

    for i, roi in enumerate(EQUIPMENT_ROIS):
        has_item, variance = detect_item_in_slot(img, roi)
        results.append(
            {
                "slot": i + 1,
                "has_item": has_item,
                "variance": variance,
            }
        )

    return results


def run_full_test(frames_dir, max_frames=20):
    """Run complete multi-element OCR test"""
    if not os.path.exists(frames_dir):
        print(f"Directory not found: {frames_dir}")
        return

    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])[
        :max_frames
    ]

    print(f"Testing {len(frames)} frames from {os.path.basename(frames_dir)}")
    print("-" * 60)

    stats = {
        "stage": {"detected": 0, "total": 0},
        "gold": {"detected": 0, "total": 0},
        "level": {"detected": 0, "total": 0},
        "xp": {"detected": 0, "total": 0},
        "hp": {"detected": 0, "total": 0},
        "shop_cards": {"detected": 0, "total": 0},
        "bench_champs": {"detected": 0, "total": 0},
        "equipment_slots": {"has_items": 0, "total": 0},
    }

    sample_results = []

    for frame in frames:
        img = cv2.imread(os.path.join(frames_dir, frame))
        if img is None:
            continue

        # Skip frames without game UI
        if not has_game_ui(img):
            continue

        # Test each element
        stage_result = test_stage_recognition(img)
        hud_results = test_hud_numbers(img)
        shop_results = test_shop_cards(img)
        bench_results = test_board_bench(img)
        equip_results = test_equipment(img)

        # Update stats
        stats["stage"]["total"] += 1
        if stage_result["detected"]:
            stats["stage"]["detected"] += 1

        for name in ["gold", "level", "xp", "hp"]:
            stats[name]["total"] += 1
            if hud_results[name]["detected"]:
                stats[name]["detected"] += 1

        for card in shop_results:
            stats["shop_cards"]["total"] += 1
            if card["name"]:
                stats["shop_cards"]["detected"] += 1

        for champ in bench_results:
            stats["bench_champs"]["total"] += 1
            if champ["name"]:
                stats["bench_champs"]["detected"] += 1

        for equip in equip_results:
            stats["equipment_slots"]["total"] += 1
            if equip["has_item"]:
                stats["equipment_slots"]["has_items"] += 1

        # Save sample results
        if len(sample_results) < 3:
            sample_results.append(
                {
                    "frame": frame,
                    "stage": stage_result,
                    "hud": hud_results,
                    "shop_sample": shop_results[:2],
                    "bench_sample": bench_results[:3],
                }
            )

    # Print results
    print("\n" + "=" * 60)
    print("MULTI-ELEMENT OCR RESULTS")
    print("=" * 60)

    print(f"\n{'Element':<20} {'Detected':<12} {'Total':<10} {'Accuracy':<12}")
    print("-" * 60)

    for element, data in stats.items():
        if data["total"] > 0:
            # Handle equipment_slots which uses "has_items" instead of "detected"
            detected_count = data.get("detected", data.get("has_items", 0))
            acc = detected_count / data["total"] * 100
            status = "✅" if acc >= 95 else ("⚠️" if acc >= 70 else "❌")
            print(
                f"{element:<20} {detected_count:<12} {data['total']:<10} {acc:.1f}% {status}"
            )
        else:
            print(f"{element:<20} {'N/A':<12} {data['total']:<10} {'N/A':<12}")

    # Print sample results
    print("\n" + "=" * 60)
    print("SAMPLE RESULTS")
    print("=" * 60)

    for sample in sample_results[:2]:
        print(f"\nFrame: {sample['frame']}")
        print(
            f"  Stage: {sample['stage']['value']} ({sample['stage']['confidence']:.0%})"
        )
        print(
            f"  HUD - Gold: {sample['hud']['gold']['value']}, Level: {sample['hud']['level']['value']}"
        )
        shop_info = [(c["name"], c["cost"]) for c in sample["shop_sample"] if c["name"]]
        print(f"  Shop: {shop_info}")
        print(f"  Bench: {[c['name'] for c in sample['bench_sample'] if c['name']]}")

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
            stats = run_full_test(frames_dir, max_frames=15)
            all_stats[os.path.basename(frames_dir)] = stats

    # Save results
    with open("examples/multi-element-ocr-results.json", "w") as f:
        json.dump(all_stats, f, indent=2)

    print("\n\nResults saved to examples/multi-element-ocr-results.json")


if __name__ == "__main__":
    main()
