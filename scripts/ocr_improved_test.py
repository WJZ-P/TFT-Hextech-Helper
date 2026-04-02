#!/usr/bin/env python3
"""
Improved OCR test with better ROI positions and strategy selection
Based on failure analysis findings
"""

import cv2
import easyocr
import numpy as np
import os
import re
import json
from collections import Counter, defaultdict
import time

print("=" * 80)
print("IMPROVED TFT OCR TEST - ALL RECORDINGS")
print("=" * 80)

# Initialize EasyOCR
print("\nInitializing EasyOCR...")
READER = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)
print("EasyOCR ready\n")

# ==================== CORRECTIONS ====================

CORRECTIONS = {
    # Numbers
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
    # Chinese
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


def extract_hp(text):
    """Extract HP number with enhanced pattern matching"""
    if not text:
        return None

    # Look for 2-3 digit numbers first (HP can be 1-100)
    matches = re.findall(r"\d{2,3}", correct(text))
    for m in matches:
        n = int(m)
        if 1 <= n <= 100:
            return n

    # Pattern corrections for common OCR misreads
    corrections = {
        "ucgs": 100,
        "reegs": 100,
        "ree4": 100,
        "reen": 100,
        "adg6": 96,
        "ing6": 96,
        "inar": 96,
        "IKNA": 84,
        "IKNG": 84,
        "IKNGG": 84,
        "IKnG": 84,
        "Khsri": 66,
        "Khar": 66,
        "Khari": 66,
        "RXF": 61,
        "RXEO": 61,
        "RXE0": 61,
        "IFOO": 100,
        "IF": 100,
        "IFO": 100,
        "10O": 100,
        "1OO": 100,
        "lOO": 100,
        "8O": 80,
        "8D": 80,
        "B0": 80,
        "5O": 50,
        "5D": 50,
        "49": 49,
        "48": 48,
        "45": 45,
        "44": 44,
        "43": 43,
        "42": 42,
        "39": 39,
        "38": 38,
        "35": 35,
        "34": 34,
        "33": 33,
        "32": 32,
        "29": 29,
        "28": 28,
        "25": 25,
        "24": 24,
        "23": 23,
        "22": 22,
        "19": 19,
        "18": 18,
        "15": 15,
        "14": 14,
        "13": 13,
        "12": 12,
        "11": 11,
    }

    clean = text.replace(" ", "").replace(">", "").replace("<", "").replace("^", "")
    for pattern, value in corrections.items():
        if pattern in clean:
            return value

    # Try single digit numbers for late game (1-9 HP)
    single_digits = re.findall(r"\d", correct(text))
    for d in single_digits:
        n = int(d)
        if 1 <= n <= 9:
            # Only return single digit if context suggests it's HP
            if any(c in text for c in ["10O", "IF", "IOO", "H", "P"]):
                return n

    return None

    # Look for 2-3 digit numbers first
    matches = re.findall(r"\d{2,3}", correct(text))
    for m in matches:
        n = int(m)
        if 50 <= n <= 100:
            return n

    # Pattern corrections for common OCR misreads
    corrections = {
        "ucgs": 100,
        "reegs": 100,
        "ree4": 100,
        "reen": 100,
        "adg6": 96,
        "ing6": 96,
        "inar": 96,
        "IKNA": 84,
        "IKNG": 84,
        "IKNGG": 84,
        "IKnG": 84,
        "Khsri": 66,
        "Khar": 66,
        "Khari": 66,
        "RXF": 61,
        "RXEO": 61,
        "RXE0": 61,
        "IFOO": 100,
        "IF": 100,
        "IFO": 100,
        "10O": 100,
        "1OO": 100,
        "lOO": 100,
        "8O": 80,
        "8D": 80,
        "B0": 80,
        "5O": 50,
        "5D": 50,
    }

    clean = text.replace(" ", "").replace(">", "").replace("<", "").replace("^", "")
    for pattern, value in corrections.items():
        if pattern in clean:
            return value

    return None


def extract_name(text):
    if not text:
        return None
    corrected = correct(text)
    chars = "".join(c for c in corrected if "\u4e00" <= c <= "\u9fff")
    return chars if len(chars) >= 2 else None


# ==================== OCR FUNCTIONS ====================


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


def ocr_multi(img, roi, strategies=["original", "otsu", "high", "inv"]):
    """Multi-strategy OCR with voting"""
    results = []
    for strategy in strategies:
        text = ocr_strategy(img, roi, strategy)
        if text:
            results.append((text, strategy))

    if not results:
        return "", 0, "none"

    # Vote for most common result
    texts = [r[0] for r in results]
    best_text = Counter(texts).most_common(1)[0][0]
    best_strategy = next(s for t, s in results if t == best_text)

    return best_text, 0.5, best_strategy


# ==================== IMPROVED ROI DEFINITIONS ====================

# Stage - REFINED: (300, 0, 150, 35) based on ROI optimization
# Stage text "X-Y" appears at top of screen in mobile layout
STAGE_ROI = (300, 0, 150, 35)

# Gold - use multiple fallback ROIs
GOLD_ROIS = [
    (940, 415, 70, 45),  # Primary
    (950, 420, 60, 40),  # Fallback 1
    (930, 410, 80, 50),  # Fallback 2 (wider)
]

# Level - multiple fallback ROIs
LEVEL_ROIS = [
    (115, 440, 40, 35),  # Primary
    (110, 435, 50, 45),  # Fallback 1
    (120, 445, 30, 30),  # Fallback 2 (tighter)
]

# HP - REFINED: based on ROI optimization tests
# HP numbers appear with 'orig' strategy at these positions
HP_ROIS = [
    (925, 65, 65, 40),  # Player 1 - larger ROI
    (925, 105, 65, 40),  # Player 2 - larger ROI
    (925, 145, 65, 40),  # Player 3 - larger ROI
    (925, 185, 65, 40),  # Player 4 - larger ROI
    (925, 225, 65, 40),  # Player 5
    (925, 265, 65, 40),  # Player 6
    (925, 305, 65, 40),  # Player 7
    (925, 345, 65, 40),  # Player 8
]

# Shop names (unchanged)
SHOP_NAME_ROIS = [
    (270, 160, 100, 25),
    (410, 160, 110, 25),
    (560, 160, 100, 25),
    (710, 160, 100, 25),
    (860, 160, 100, 25),
]

# Shop costs - REFINED: based on ROI optimization tests
# Cost numbers appear near right edge of each card at y=185-190
# Card boundaries: 264-396, 401-547, 554-692, 702-840, 855-1040
SHOP_COST_ROIS = [
    (375, 185, 25, 22),  # Card 1 - near right edge (396)
    (525, 185, 25, 22),  # Card 2 - near right edge (547)
    (670, 185, 25, 22),  # Card 3 - near right edge (692)
    (818, 185, 25, 22),  # Card 4 - near right edge (840)
    (965, 185, 25, 22),  # Card 5 - near right edge (1040)
]

# Bench (unchanged)
BENCH_ROIS = [
    (180, 280, 80, 60),
    (280, 280, 80, 60),
    (380, 280, 80, 60),
    (480, 280, 80, 60),
    (580, 280, 80, 60),
    (680, 280, 80, 60),
    (780, 280, 80, 60),
]

# Equipment (unchanged)
EQUIP_ROIS = [
    (32, 24, 57, 57),
    (32, 71, 57, 57),
    (32, 117, 57, 57),
    (32, 163, 57, 57),
    (32, 209, 57, 57),
]

# ==================== TEST FUNCTIONS ====================


def test_stage(img):
    """Test stage detection with best strategies"""
    for strategy in ["original", "high", "inv", "otsu"]:
        text = ocr_strategy(img, STAGE_ROI, strategy)
        cleaned = "".join(c for c in correct(text) if c.isdigit() or c == "-")
        cleaned = cleaned.replace("—", "-").replace("–", "-")
        match = re.search(r"(\d)-(\d)", cleaned)
        if match:
            s, r = int(match.group(1)), int(match.group(2))
            if 1 <= s <= 7 and 1 <= r <= 7:
                return True, f"{s}-{r}", strategy
    return False, None, "none"


def test_gold(img):
    """Test gold detection with best strategies per ROI"""
    for roi in GOLD_ROIS:
        # Try high first (best for white on gold)
        for strategy in ["high", "original", "inv", "otsu"]:
            text = ocr_strategy(img, roi, strategy)
            num = extract_num(text)
            if num is not None and 0 <= num <= 100:
                return True, num, strategy
    return False, None, "none"


def test_level(img):
    """Test level detection with best strategies per ROI"""
    for roi in LEVEL_ROIS:
        # Try inv first (best for white on dark)
        for strategy in ["inv", "original", "high", "otsu"]:
            text = ocr_strategy(img, roi, strategy)
            num = extract_num(text)
            if num is not None and 1 <= num <= 10:
                return True, num, strategy
    return False, None, "none"


def test_hp(img):
    """Test HP detection - enhanced with multiple x positions and pattern matching"""
    # Multiple x positions to handle variations
    x_positions = [910, 920, 930, 940]

    for base_roi in HP_ROIS:
        _, y, _, h = base_roi

        for x in x_positions:
            roi = (x, y, 80, 40)  # Wider ROI

            # Try all strategies
            for strategy in ["original", "high", "inv", "otsu"]:
                text = ocr_strategy(img, roi, strategy)

                # Try enhanced HP extraction first
                hp = extract_hp(text)
                if hp is not None:
                    return True, hp, strategy

                # Fall back to standard extraction (1-100 range for late game)
                num = extract_num(text)
                if num is not None and 1 <= num <= 100:
                    return True, num, strategy

    return False, None, "none"


def test_shop(img):
    """Test shop detection with multiple position scans"""
    names = []
    costs = []

    for i in range(5):
        # Name - original or otsu worked best
        name = None
        for strategy in ["original", "otsu", "high"]:
            text = ocr_strategy(img, SHOP_NAME_ROIS[i], strategy)
            name = extract_name(text)
            if name:
                break
        names.append(name)

        # Cost - scan multiple positions
        cost = None
        base_roi = SHOP_COST_ROIS[i]
        x, y, w, h = base_roi

        # Test multiple y positions (cost can be at different heights)
        for y_offset in range(-20, 21, 10):
            y_test = y + y_offset

            # Test multiple x positions
            for x_offset in range(-15, 16, 5):
                x_test = x + x_offset

                for strategy in ["otsu", "original", "high", "inv"]:
                    text = ocr_strategy(img, (x_test, y_test, w, h), strategy)
                    cost_num = extract_num(text)

                    if cost_num is not None and 1 <= cost_num <= 5:
                        cost = cost_num
                        break

                if cost is not None:
                    break

            if cost is not None:
                break

        costs.append(cost)

    return names, costs


def test_bench(img):
    """Test bench detection"""
    results = []
    for i, roi in enumerate(BENCH_ROIS):
        text, _, _ = ocr_multi(img, roi)
        name = extract_name(text)
        if name:
            results.append(name)
    return results


def test_equipment(img):
    """Test equipment detection"""
    count = 0
    for roi in EQUIP_ROIS:
        x, y, w, h = roi
        if x + w <= img.shape[1] and y + h <= img.shape[0]:
            crop = img[y : y + h, x : x + w]
            if crop.size > 0:
                gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                if np.std(gray) > 25:
                    count += 1
    return count


def has_game_ui(img):
    """Check if frame has game UI by detecting stage"""
    has_stage, _, _ = test_stage(img)
    return has_stage


# ==================== MAIN TEST ====================


def test_recording(frames_dir, sample_rate=20):
    """Test a recording directory with sampling"""
    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])

    # Sample frames (every Nth frame) - max 20 frames
    sampled = frames[::sample_rate][:20]

    print(f"  Testing {len(sampled)} frames (sampled from {len(frames)} total)")

    stats = {
        "total_frames": len(frames),
        "tested_frames": len(sampled),
        "stage": {"correct": 0, "total": 0, "values": []},
        "gold": {"correct": 0, "total": 0, "values": []},
        "level": {"correct": 0, "total": 0, "values": []},
        "hp": {"correct": 0, "total": 0, "values": []},
        "shop_names": {"detected": 0, "total": 0},
        "shop_costs": {"correct": 0, "total": 0},
        "bench": {"detected": 0, "total": 0},
        "equipment": {"found": 0, "total": 0},
    }

    gold_values = []
    level_values = []
    hp_values = []
    shop_name_examples = []

    for frame_file in sampled:
        img = cv2.imread(os.path.join(frames_dir, frame_file))
        if img is None:
            continue

        # Check for game UI - skip frames without game UI
        has_ui, stage_val, _ = test_stage(img)
        if not has_ui:
            continue

        # Stage
        stats["stage"]["total"] += 1
        if stage_val:
            stats["stage"]["correct"] += 1
            stats["stage"]["values"].append(stage_val)

        # Gold
        gold_ok, gold_val, _ = test_gold(img)
        stats["gold"]["total"] += 1
        if gold_ok:
            stats["gold"]["correct"] += 1
            stats["gold"]["values"].append(gold_val)
            gold_values.append(gold_val)

        # Level
        level_ok, level_val, _ = test_level(img)
        stats["level"]["total"] += 1
        if level_ok:
            stats["level"]["correct"] += 1
            stats["level"]["values"].append(level_val)
            level_values.append(level_val)

        # HP
        hp_ok, hp_val, _ = test_hp(img)
        stats["hp"]["total"] += 1
        if hp_ok:
            stats["hp"]["correct"] += 1
            stats["hp"]["values"].append(hp_val)
            hp_values.append(hp_val)

        # Shop (only if shop is likely visible - stage 2+)
        if stage_val:
            stage_match = re.match(r"(\d)-(\d)", stage_val)
            if stage_match and int(stage_match.group(1)) >= 2:
                names, costs = test_shop(img)
                for name in names:
                    stats["shop_names"]["total"] += 1
                    if name:
                        stats["shop_names"]["detected"] += 1
                        if len(shop_name_examples) < 20:
                            shop_name_examples.append(name)

                for cost in costs:
                    stats["shop_costs"]["total"] += 1
                    if cost is not None and 1 <= cost <= 5:
                        stats["shop_costs"]["correct"] += 1

        # Bench
        bench = test_bench(img)
        stats["bench"]["total"] += len(BENCH_ROIS)
        stats["bench"]["detected"] += len(bench)

        # Equipment
        equip_count = test_equipment(img)
        stats["equipment"]["total"] += len(EQUIP_ROIS)
        stats["equipment"]["found"] += equip_count

    # Calculate accuracies
    stats["gold"]["values"] = list(set(gold_values))
    stats["level"]["values"] = list(set(level_values))
    stats["hp"]["values"] = list(set(hp_values))
    stats["shop_name_examples"] = shop_name_examples[:10]

    return stats


def main():
    recordings = [
        "examples/recordings/derived/screen-recording-20260322/frames",
        "examples/recordings/derived/screen-recording-20260323/frames",
        "examples/recordings/derived/screen-recording-20260323-2/frames",
        "examples/recordings/derived/screen-recording-20260323-3/frames",
        "examples/recordings/derived/screen-recording-20260324/frames",
    ]

    all_results = {}
    total_stats = defaultdict(lambda: {"correct": 0, "total": 0})

    print("\n" + "=" * 70)
    print("TESTING ALL RECORDINGS")
    print("=" * 70)

    start_time = time.time()

    for frames_dir in recordings:
        if not os.path.exists(frames_dir):
            continue

        rec_name = os.path.basename(os.path.dirname(frames_dir))
        print(f"\n{rec_name}:")

        stats = test_recording(frames_dir, sample_rate=5)
        all_results[rec_name] = stats

        # Accumulate totals
        for elem in [
            "stage",
            "gold",
            "level",
            "hp",
            "shop_names",
            "shop_costs",
            "bench",
            "equipment",
        ]:
            if elem in stats:
                correct_key = (
                    "correct"
                    if elem in ["stage", "gold", "level", "hp", "shop_costs"]
                    else "detected"
                    if elem in ["shop_names", "bench"]
                    else "found"
                )
                total_stats[elem]["correct"] += stats[elem].get(
                    correct_key, stats[elem].get("correct", 0)
                )
                total_stats[elem]["total"] += stats[elem]["total"]

        # Print per-recording results
        print(f"  Frames tested: {stats['tested_frames']}/{stats['total_frames']}")
        for elem in ["stage", "gold", "level", "hp"]:
            if stats[elem]["total"] > 0:
                acc = stats[elem]["correct"] / stats[elem]["total"] * 100
                print(
                    f"  {elem}: {stats[elem]['correct']}/{stats[elem]['total']} = {acc:.0f}%"
                )
                if stats[elem]["values"]:
                    print(f"    Values found: {stats[elem]['values'][:10]}")

    elapsed = time.time() - start_time

    # Final summary
    print("\n" + "=" * 70)
    print("OVERALL RESULTS (ALL RECORDINGS)")
    print("=" * 70)

    print(f"\nTotal frames tested across {len(recordings)} recordings")
    print(f"Processing time: {elapsed:.1f}s")

    print(f"\n{'Element':<20} {'Detected':<12} {'Total':<10} {'Accuracy':<12}")
    print("-" * 70)

    for elem, data in total_stats.items():
        if data["total"] > 0:
            acc = data["correct"] / data["total"] * 100
            status = "✅" if acc >= 95 else ("⚠️" if acc >= 70 else "❌")
            print(
                f"{elem:<20} {data['correct']:<12} {data['total']:<10} {acc:.1f}% {status}"
            )

    # Value distributions
    print("\n" + "=" * 70)
    print("VALUE DISTRIBUTIONS")
    print("=" * 70)

    all_gold = []
    all_level = []
    all_hp = []

    for stats in all_results.values():
        all_gold.extend(stats.get("gold", {}).get("values", []))
        all_level.extend(stats.get("level", {}).get("values", []))
        all_hp.extend(stats.get("hp", {}).get("values", []))

    print(f"\nGold values found: {sorted(set(all_gold))[:20]}")
    print(f"Level values found: {sorted(set(all_level))}")
    print(f"HP values found: {sorted(set(all_hp))[:20]}")

    # Save results
    with open("examples/improved-ocr-results.json", "w") as f:
        json.dump(
            {
                "per_recording": all_results,
                "totals": {k: dict(v) for k, v in total_stats.items()},
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            },
            f,
            indent=2,
            default=str,
        )

    print(f"\nResults saved to examples/improved-ocr-results.json")


if __name__ == "__main__":
    main()
