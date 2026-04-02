#!/usr/bin/env python3
"""
Improved OCR Module for TFT Multi-Element Recognition
Features:
- Template matching for digits (level, cost, gold)
- EasyOCR for text (champion names, stage)
- Character correction for common misreads
- Multi-strategy fallback
"""

import cv2
import easyocr
import numpy as np
import re
import os
import json
import time
from pathlib import Path

print("=" * 80)
print("TFT IMPROVED OCR MODULE")
print("=" * 80)

# Initialize EasyOCR
print("\nInitializing EasyOCR...")
READER = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)
print("EasyOCR ready\n")

# ==================== CHARACTER CORRECTION ====================

# Common OCR misreads for Chinese characters
CHINESE_CORRECTIONS = {
    "声": "萨",  # 萨勒芬妮
    "萑": "崔",  # 崔斯特
    "左": "佐",  # 佐伊
    "斤": "斯",  # 斯维因
    "产": "萨",  # 萨
    "蕾": "蔚",  # 蔚 (sometimes misread)
}

# Common OCR misreads for numbers
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
    " ": "",
}


def correct_chinese(text):
    """Correct common Chinese OCR misreads"""
    if not text:
        return text
    result = text
    for wrong, correct in CHINESE_CORRECTIONS.items():
        result = result.replace(wrong, correct)
    return result


def correct_number(text):
    """Correct common number OCR misreads"""
    if not text:
        return text
    result = text
    for wrong, correct in NUMBER_CORRECTIONS.items():
        result = result.replace(wrong, correct)
    return result


def extract_number(text):
    """Extract number from OCR text with corrections"""
    if not text:
        return None
    corrected = correct_number(text)
    digits = re.findall(r"\d+", corrected)
    if digits:
        return int(digits[0])
    return None


def extract_champion_name(text):
    """Extract champion name from OCR text with corrections"""
    if not text:
        return None
    corrected = correct_chinese(text)
    chinese_chars = "".join(c for c in corrected if "\u4e00" <= c <= "\u9fff")
    if len(chinese_chars) >= 2:
        return chinese_chars
    return corrected.strip() if corrected.strip() else None


# ==================== TEMPLATE MATCHING FOR DIGITS ====================


class DigitTemplateMatcher:
    """Template matching for digit recognition"""

    def __init__(self):
        self.templates = {}
        self._create_builtin_templates()

    def _create_builtin_templates(self):
        """Create simple digit templates for matching"""
        # Create basic 7-segment style digit templates
        # These are simplified but should work for typical TFT UI fonts

        digit_patterns = {
            "0": [
                "11111",
                "10001",
                "10001",
                "10001",
                "11111",
            ],
            "1": [
                "00100",
                "01100",
                "00100",
                "00100",
                "01110",
            ],
            "2": [
                "11111",
                "00001",
                "11111",
                "10000",
                "11111",
            ],
            "3": [
                "11111",
                "00001",
                "11111",
                "00001",
                "11111",
            ],
            "4": [
                "10001",
                "10001",
                "11111",
                "00001",
                "00001",
            ],
            "5": [
                "11111",
                "10000",
                "11111",
                "00001",
                "11111",
            ],
            "6": [
                "11111",
                "10000",
                "11111",
                "10001",
                "11111",
            ],
            "7": [
                "11111",
                "00001",
                "00010",
                "00100",
                "00100",
            ],
            "8": [
                "11111",
                "10001",
                "11111",
                "10001",
                "11111",
            ],
            "9": [
                "11111",
                "10001",
                "11111",
                "00001",
                "11111",
            ],
        }

        for digit, pattern in digit_patterns.items():
            # Convert pattern to template image
            h = len(pattern)
            w = len(pattern[0])
            template = np.zeros((h * 6, w * 6), dtype=np.uint8)

            for y, row in enumerate(pattern):
                for x, cell in enumerate(row):
                    if cell == "1":
                        template[y * 6 : (y + 1) * 6, x * 6 : (x + 1) * 6] = 255

            self.templates[digit] = template

    def add_template(self, digit, image):
        """Add a custom template for a digit"""
        gray = (
            cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        )
        _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
        resized = cv2.resize(binary, (30, 50))
        self.templates[digit] = resized

    def match_digit(self, image, threshold=0.6):
        """Match a single digit image against templates"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        best_digit = None
        best_score = 0

        for digit, template in self.templates.items():
            if (
                template.shape[0] > binary.shape[0]
                or template.shape[1] > binary.shape[1]
            ):
                continue

            result = cv2.matchTemplate(binary, template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)

            if max_val > best_score:
                best_score = max_val
                best_digit = digit

        if best_score >= threshold:
            return int(best_digit), best_score
        return None, best_score

    def match_number(self, image, threshold=0.6):
        """Match multiple digits in an image"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Find contours to separate digits
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        # Sort contours left to right
        contours = sorted(contours, key=lambda c: cv2.boundingRect(c)[0])

        digits = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)

            # Filter small noise
            if w < 5 or h < 10:
                continue

            digit_img = gray[y : y + h, x : x + w]
            digit, score = self.match_digit(digit_img, threshold)

            if digit is not None:
                digits.append(str(digit))

        if digits:
            return int("".join(digits)), np.mean(
                [score for _, score in [(d, 0.8) for d in digits]]
            )
        return None, 0


# Initialize template matcher
template_matcher = DigitTemplateMatcher()


# ==================== ROI DEFINITIONS ====================

# Android mobile layout for 1040x480 resolution
STAGE_ROI = (370, 8, 160, 25)
GOLD_ROI = (950, 415, 50, 45)
LEVEL_ROI = (115, 440, 40, 35)
XP_ROI = (20, 395, 100, 25)
HP_ROI = (940, 65, 45, 25)

# Shop card boundaries: 264-396, 401-547, 554-692, 702-840, 855-1040
SHOP_NAME_ROIS = [
    (270, 160, 100, 25),
    (410, 160, 110, 25),
    (560, 160, 100, 25),
    (710, 160, 100, 25),
    (860, 160, 100, 25),
]

SHOP_COST_ROIS = [
    (365, 160, 35, 25),
    (515, 160, 35, 25),
    (660, 160, 35, 25),
    (810, 160, 35, 25),
    (1000, 160, 35, 25),
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


# ==================== OCR FUNCTIONS ====================


def ocr_region(img, roi, method="auto"):
    """OCR a specific region with multiple strategies"""
    x, y, w, h = roi

    # Bounds checking
    img_h, img_w = img.shape[:2]
    if x >= img_w or y >= img_h or x + w <= 0 or y + h <= 0:
        return "", 0

    # Clamp to image bounds
    x = max(0, x)
    y = max(0, y)
    w = min(w, img_w - x)
    h = min(h, img_h - y)

    if w <= 0 or h <= 0:
        return "", 0

    crop = img[y : y + h, x : x + w]

    if crop.size == 0 or crop.shape[0] < 2 or crop.shape[1] < 2:
        return "", 0

    # Strategy 1: Template matching for digits (if requested)
    if method == "digits":
        result, confidence = template_matcher.match_number(crop)
        if result is not None:
            return str(result), confidence

    # Strategy 2: EasyOCR with Otsu threshold
    try:
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)

        results = READER.readtext(
            rgb, paragraph=False, min_size=1, text_threshold=0.1, low_text=0.1
        )

        texts = [t for _, t, _ in results if t.strip()]
        confidences = [c for _, _, c in results]

        combined_text = " ".join(texts)
        avg_conf = sum(confidences) / len(confidences) if confidences else 0

        return combined_text, avg_conf
    except Exception:
        return "", 0


def detect_item_in_slot(img, roi):
    """Detect if an item exists in an equipment slot"""
    x, y, w, h = roi
    crop = img[y : y + h, x : x + w]

    if crop.size == 0:
        return False, 0

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    std_val = np.std(gray)

    return std_val > 25, std_val


# ==================== TEST FUNCTIONS ====================


def test_stage_recognition(img):
    """Test stage recognition"""
    text, conf = ocr_region(img, STAGE_ROI)

    # Extract stage pattern (X-Y)
    cleaned = correct_number(text)
    cleaned = cleaned.replace("—", "-").replace("–", "-")
    cleaned = "".join(c for c in cleaned if c.isdigit() or c == "-")

    match = re.search(r"(\d)-(\d)", cleaned)
    if match:
        s, r = int(match.group(1)), int(match.group(2))
        if 1 <= s <= 7 and 1 <= r <= 7:
            return {"detected": True, "value": f"{s}-{r}", "confidence": conf}

    return {"detected": False, "value": None, "confidence": conf}


def test_gold_detection(img):
    """Test gold detection using template matching"""
    # Try template matching first (more reliable for numbers)
    crop = img[
        GOLD_ROI[1] : GOLD_ROI[1] + GOLD_ROI[3], GOLD_ROI[0] : GOLD_ROI[0] + GOLD_ROI[2]
    ]

    result, confidence = template_matcher.match_number(crop)
    if result is not None and 0 <= result <= 100:
        return {
            "detected": True,
            "value": result,
            "confidence": confidence,
            "method": "template",
        }

    # Fallback to OCR
    text, conf = ocr_region(img, GOLD_ROI)
    number = extract_number(text)

    if number is not None and 0 <= number <= 100:
        return {"detected": True, "value": number, "confidence": conf, "method": "ocr"}

    return {"detected": False, "value": None, "confidence": 0, "method": "none"}


def test_level_detection(img):
    """Test level detection using template matching"""
    crop = img[
        LEVEL_ROI[1] : LEVEL_ROI[1] + LEVEL_ROI[3],
        LEVEL_ROI[0] : LEVEL_ROI[0] + LEVEL_ROI[2],
    ]

    # Try template matching
    result, confidence = template_matcher.match_number(crop, threshold=0.5)
    if result is not None and 1 <= result <= 10:
        return {
            "detected": True,
            "value": result,
            "confidence": confidence,
            "method": "template",
        }

    # Fallback to OCR
    text, conf = ocr_region(img, LEVEL_ROI)
    number = extract_number(text)

    if number is not None and 1 <= number <= 10:
        return {"detected": True, "value": number, "confidence": conf, "method": "ocr"}

    return {"detected": False, "value": None, "confidence": 0, "method": "none"}


def test_hp_detection(img):
    """Test HP detection - scan multiple player positions"""
    # HP values are at the right side of each player row in sidebar
    # Try multiple rows to find current player's HP
    hp_positions = [
        (940, 65, 45, 25),  # Player 1
        (940, 105, 45, 25),  # Player 2
        (940, 145, 45, 25),  # Player 3
        (940, 185, 45, 25),  # Player 4
    ]

    for pos in hp_positions:
        text, conf = ocr_region(img, pos)
        number = extract_number(text)

        if number is not None and 50 <= number <= 100:
            return {
                "detected": True,
                "value": number,
                "confidence": conf,
                "position": pos,
            }

    return {"detected": False, "value": None, "confidence": 0}


def test_shop_cards(img):
    """Test shop card recognition"""
    results = []

    for i in range(5):
        # Name
        name_text, name_conf = ocr_region(img, SHOP_NAME_ROIS[i])
        name = extract_champion_name(name_text)

        # Cost - try template matching first
        x, y, w, h = SHOP_COST_ROIS[i]

        # Bounds check
        if x + w > img.shape[1] or y + h > img.shape[0]:
            cost = None
            cost_conf = 0
        else:
            cost_crop = img[y : y + h, x : x + w]

            cost = None
            cost_conf = 0

            if cost_crop.size > 0 and cost_crop.shape[0] > 2 and cost_crop.shape[1] > 2:
                cost, cost_conf = template_matcher.match_number(
                    cost_crop, threshold=0.5
                )
                if cost is None:
                    # Fallback to OCR with error handling
                    try:
                        gray = cv2.cvtColor(cost_crop, cv2.COLOR_BGR2GRAY)
                        _, binary = cv2.threshold(
                            gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
                        )
                        rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)

                        results_ocr = READER.readtext(
                            rgb,
                            paragraph=False,
                            min_size=1,
                            text_threshold=0.1,
                            low_text=0.1,
                        )
                        texts = [t for _, t, _ in results_ocr if t.strip()]
                        if texts:
                            cost = extract_number(" ".join(texts))
                            confidences = [c for _, _, c in results_ocr]
                            cost_conf = (
                                sum(confidences) / len(confidences)
                                if confidences
                                else 0
                            )
                    except Exception:
                        pass

        results.append(
            {
                "slot": i + 1,
                "name": name,
                "cost": cost,
                "name_confidence": name_conf,
                "cost_confidence": cost_conf if isinstance(cost_conf, float) else 0,
            }
        )

    return results


def test_bench_champions(img):
    """Test bench champion recognition"""
    results = []

    for i, roi in enumerate(BENCH_ROIS):
        text, conf = ocr_region(img, roi)
        name = extract_champion_name(text)

        if name:
            results.append({"position": i, "name": name, "confidence": conf})

    return results


def test_equipment(img):
    """Test equipment slot detection"""
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


def has_game_ui(img):
    """Check if frame has game UI"""
    text, conf = ocr_region(img, STAGE_ROI)
    match = re.search(r"(\d)-(\d)", correct_number(text))
    return match is not None


# ==================== MAIN TEST ====================


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
        "hp": {"detected": 0, "total": 0},
        "shop_names": {"detected": 0, "total": 0},
        "shop_costs": {"detected": 0, "total": 0},
        "bench_champs": {"detected": 0, "total": 0},
        "equipment_slots": {"has_items": 0, "total": 0},
    }

    sample_results = []

    for frame in frames:
        img = cv2.imread(os.path.join(frames_dir, frame))
        if img is None:
            continue

        if not has_game_ui(img):
            continue

        # Test each element
        stage_result = test_stage_recognition(img)
        gold_result = test_gold_detection(img)
        level_result = test_level_detection(img)
        hp_result = test_hp_detection(img)
        shop_results = test_shop_cards(img)
        bench_results = test_bench_champions(img)
        equip_results = test_equipment(img)

        # Update stats
        stats["stage"]["total"] += 1
        if stage_result["detected"]:
            stats["stage"]["detected"] += 1

        stats["gold"]["total"] += 1
        if gold_result["detected"]:
            stats["gold"]["detected"] += 1

        stats["level"]["total"] += 1
        if level_result["detected"]:
            stats["level"]["detected"] += 1

        stats["hp"]["total"] += 1
        if hp_result["detected"]:
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
            stats["equipment_slots"]["total"] += 1
            if equip["has_item"]:
                stats["equipment_slots"]["has_items"] += 1

        # Save sample results
        if len(sample_results) < 3:
            sample_results.append(
                {
                    "frame": frame,
                    "stage": stage_result,
                    "gold": gold_result,
                    "level": level_result,
                    "hp": hp_result,
                    "shop_sample": shop_results[:2],
                }
            )

    # Print results
    print("\n" + "=" * 70)
    print("IMPROVED MULTI-ELEMENT OCR RESULTS")
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

    # Print sample results
    print("\n" + "=" * 70)
    print("SAMPLE RESULTS")
    print("=" * 70)

    for sample in sample_results[:2]:
        print(f"\nFrame: {sample['frame']}")
        print(
            f"  Stage: {sample['stage']['value']} ({sample['stage']['confidence']:.0%})"
        )
        print(f"  Gold: {sample['gold']['value']} (method: {sample['gold']['method']})")
        print(
            f"  Level: {sample['level']['value']} (method: {sample['level']['method']})"
        )
        print(f"  HP: {sample['hp']['value']}")
        shop_info = [(c["name"], c["cost"]) for c in sample["shop_sample"] if c["name"]]
        print(f"  Shop: {shop_info}")

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
    with open("examples/improved-ocr-results.json", "w") as f:
        json.dump(all_stats, f, indent=2)

    print("\n\nResults saved to examples/improved-ocr-results.json")


if __name__ == "__main__":
    main()
