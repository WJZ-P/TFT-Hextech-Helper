#!/usr/bin/env python3
"""
Full OCR Method Comparison: Tesseract (SimpleOCR) vs EasyOCR vs Combined Voting
Tests on all 5 recordings including 2 new ones
"""

import cv2
import easyocr
import numpy as np
import os
import re
import time
import json
from pathlib import Path

# Check Tesseract availability
try:
    import pytesseract
    from PIL import Image

    TESSERACT_AVAILABLE = True
    print("✅ Tesseract (pytesseract) available")
except ImportError:
    TESSERACT_AVAILABLE = False
    print("❌ Tesseract not available - will use EasyOCR as baseline for comparison")

# Configuration
X_POSITIONS = [280, 300, 320, 340, 360, 380, 400]
THRESHOLDS = [140, 120, 100]

# Initialize EasyOCR reader
print("Initializing EasyOCR...")
READER = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)
print("EasyOCR ready\n")


def extract_stage(text):
    """Extract stage text (X-Y format) from OCR output"""
    if not text:
        return None

    # Remove Chinese characters
    cleaned = "".join(c for c in text if not ("\u4e00" <= c <= "\u9fff"))
    # Normalize hyphens
    cleaned = cleaned.replace("—", "-").replace("–", "-").replace("－", "-")
    # Keep only digits and hyphens
    cleaned = "".join(c for c in cleaned if c.isdigit() or c == "-")

    # Try direct X-Y match
    match = re.search(r"(\d)-(\d)", cleaned)
    if match:
        stage, round_num = int(match.group(1)), int(match.group(2))
        if 1 <= stage <= 7 and 1 <= round_num <= 7:
            return match.group(0)

    # Try to find consecutive digits
    digits = re.findall(r"\d", cleaned)
    if len(digits) >= 2:
        stage, round_num = int(digits[0]), int(digits[1])
        if 1 <= stage <= 7 and 1 <= round_num <= 7:
            return f"{stage}-{round_num}"
        stage, round_num = int(digits[-2]), int(digits[-1])
        if 1 <= stage <= 7 and 1 <= round_num <= 7:
            return f"{stage}-{round_num}"

    return None


def has_stage_indicator(img):
    """Check if frame has stage indicator (not a banner/loading screen)"""
    crop = img[0:60, 300:500]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 140, 255, cv2.THRESH_BINARY)
    rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)

    results = READER.readtext(rgb, paragraph=False, min_size=6, text_threshold=0.2)
    text = " ".join(t for _, t, _ in results)

    has_digits = bool(re.search(r"\d", text))
    has_chinese = sum(1 for c in text if "\u4e00" <= c <= "\u9fff") > 2

    return has_digits and not has_chinese


# ==================== OCR METHODS ====================


def method_tesseract(img):
    """SimpleOCR / Tesseract method"""
    if not TESSERACT_AVAILABLE:
        return "", 0

    for x in X_POSITIONS:
        crop = img[0:60, x : x + 200]
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

        for thresh in THRESHOLDS:
            _, binary = cv2.threshold(gray, thresh, 255, cv2.THRESH_BINARY)

            try:
                custom_config = (
                    r"--oem 3 --psm 7 -c tessedit_char_whitelist=0123456789-"
                )
                text = pytesseract.image_to_string(binary, config=custom_config)
                stage = extract_stage(text.strip())
                if stage:
                    return (
                        stage,
                        0.7,
                    )  # Tesseract doesn't give reliable per-word confidence
            except Exception:
                pass

        # Also try grayscale
        norm = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
        try:
            text = pytesseract.image_to_string(norm, config=r"--oem 3 --psm 7")
            stage = extract_stage(text.strip())
            if stage:
                return stage, 0.6
        except Exception:
            pass

    return "", 0


def method_easyocr(img):
    """EasyOCR method (Basic - single threshold)"""
    best_text, best_conf = "", 0

    for x in [320, 340, 360, 380]:
        crop = img[0:60, x : x + 200]
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 140, 255, cv2.THRESH_BINARY)
        rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)

        results = READER.readtext(
            rgb, paragraph=False, min_size=8, text_threshold=0.3, low_text=0.2
        )
        for _, text, conf in results:
            stage = extract_stage(text)
            if stage and conf > best_conf:
                best_text, best_conf = stage, conf

        if best_conf >= 0.9:
            break

    return best_text, best_conf


def method_easyocr_multi_thresh(img):
    """EasyOCR with multi-threshold (improved)"""
    best_text, best_conf = "", 0

    for x in X_POSITIONS:
        crop = img[0:60, x : x + 200]
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

        for thresh in THRESHOLDS:
            _, binary = cv2.threshold(gray, thresh, 255, cv2.THRESH_BINARY)
            rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)

            results = READER.readtext(
                rgb, paragraph=False, min_size=8, text_threshold=0.3, low_text=0.2
            )
            for _, text, conf in results:
                stage = extract_stage(text)
                if stage and conf > best_conf:
                    best_text, best_conf = stage, conf

            if best_conf >= 0.9:
                return best_text, best_conf

    return best_text, best_conf


def method_combined_voting(img):
    """Combined voting method - EasyOCR + Tesseract with weighted voting"""
    candidates = []  # (stage, confidence, source)

    # EasyOCR results (weight: 1.2x - typically more accurate)
    for x in X_POSITIONS:
        crop = img[0:60, x : x + 200]
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

        for thresh in THRESHOLDS:
            _, binary = cv2.threshold(gray, thresh, 255, cv2.THRESH_BINARY)
            rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)

            results = READER.readtext(
                rgb, paragraph=False, min_size=8, text_threshold=0.3, low_text=0.2
            )
            for _, text, conf in results:
                stage = extract_stage(text)
                if stage:
                    candidates.append((stage, conf * 1.2, "easyocr"))

    # Tesseract results (weight: 1.0x)
    if TESSERACT_AVAILABLE:
        for x in X_POSITIONS:
            crop = img[0:60, x : x + 200]
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

            for thresh in THRESHOLDS:
                _, binary = cv2.threshold(gray, thresh, 255, cv2.THRESH_BINARY)
                try:
                    text = pytesseract.image_to_string(
                        binary,
                        config=r"--oem 3 --psm 7 -c tessedit_char_whitelist=0123456789-",
                    )
                    stage = extract_stage(text.strip())
                    if stage:
                        candidates.append((stage, 0.7 * 1.0, "tesseract"))
                except Exception:
                    pass

    # Voting: aggregate by stage
    stage_scores = {}
    stage_counts = {}

    for stage, weighted_conf, source in candidates:
        if stage not in stage_scores:
            stage_scores[stage] = []
            stage_counts[stage] = 0
        stage_scores[stage].append(weighted_conf)
        stage_counts[stage] += 1

    # Find best stage (highest weighted average + agreement bonus)
    best_text, best_score = "", 0

    for stage, scores in stage_scores.items():
        avg_score = sum(scores) / len(scores)
        agreement_bonus = min(len(scores) * 0.05, 0.2)  # Bonus for multiple detections
        final_score = avg_score + agreement_bonus

        if final_score > best_score:
            best_text = stage
            best_score = min(final_score, 1.0)

    return best_text, best_score


# ==================== TESTING ====================


def run_comparison(frames_dir, max_frames=30):
    """Run comparison on frames directory"""
    if not os.path.exists(frames_dir):
        print(f"  Directory not found: {frames_dir}")
        return None

    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])[
        :max_frames
    ]

    results = {
        "tesseract": {"detected": 0, "total": 0, "errors": 0, "times": []},
        "easyocr_basic": {"detected": 0, "total": 0, "errors": 0, "times": []},
        "easyocr_multi": {"detected": 0, "total": 0, "errors": 0, "times": []},
        "combined_voting": {"detected": 0, "total": 0, "errors": 0, "times": []},
    }

    methods = [
        ("tesseract", method_tesseract),
        ("easyocr_basic", method_easyocr),
        ("easyocr_multi", method_easyocr_multi_thresh),
        ("combined_voting", method_combined_voting),
    ]

    for frame in frames:
        img = cv2.imread(os.path.join(frames_dir, frame))
        if img is None:
            continue

        # Skip frames without stage indicator
        if not has_stage_indicator(img):
            continue

        for method_name, method_func in methods:
            results[method_name]["total"] += 1

            try:
                start_time = time.time()
                text, conf = method_func(img)
                elapsed = time.time() - start_time

                results[method_name]["times"].append(elapsed)
                if text:
                    results[method_name]["detected"] += 1
            except Exception as e:
                results[method_name]["errors"] += 1

    return results


def print_results(all_results):
    """Print aggregated results"""
    print("\n" + "=" * 80)
    print("FULL OCR METHOD COMPARISON RESULTS")
    print("=" * 80)

    method_names = {
        "tesseract": "SimpleOCR (Tesseract)",
        "easyocr_basic": "EasyOCR Basic",
        "easyocr_multi": "EasyOCR Multi-Thresh",
        "combined_voting": "Combined Voting",
    }

    # Aggregate across all recordings
    aggregated = {
        k: {"detected": 0, "total": 0, "errors": 0, "times": []} for k in method_names
    }

    for rec_name, results in all_results.items():
        if results is None:
            continue
        print(f"\n{rec_name}:")
        print(f"  {'Method':<25} {'Accuracy':<12} {'Avg Time':<12}")
        print(f"  {'-' * 50}")

        for method_key, method_name in method_names.items():
            r = results[method_key]
            acc = (r["detected"] / r["total"] * 100) if r["total"] > 0 else 0
            avg_time = sum(r["times"]) / len(r["times"]) * 1000 if r["times"] else 0
            status = "✅" if acc >= 95 else "❌"
            print(f"  {method_name:<25} {acc:>6.1f}%{status:>3}     {avg_time:>6.0f}ms")

            # Aggregate
            aggregated[method_key]["detected"] += r["detected"]
            aggregated[method_key]["total"] += r["total"]
            aggregated[method_key]["errors"] += r["errors"]
            aggregated[method_key]["times"].extend(r["times"])

    # Overall summary
    print("\n" + "=" * 80)
    print("OVERALL SUMMARY (ALL RECORDINGS)")
    print("=" * 80)
    print(
        f"\n{'Method':<25} {'Detected':<10} {'Total':<10} {'Accuracy':<12} {'Avg Time':<12}"
    )
    print("-" * 80)

    best_method = None
    best_accuracy = 0

    for method_key, method_name in method_names.items():
        r = aggregated[method_key]
        acc = (r["detected"] / r["total"] * 100) if r["total"] > 0 else 0
        avg_time = sum(r["times"]) / len(r["times"]) * 1000 if r["times"] else 0
        status = "✅ ≥95%" if acc >= 95 else "❌ <95%"
        print(
            f"{method_name:<25} {r['detected']:<10} {r['total']:<10} {acc:>6.1f}%{status:>6}   {avg_time:>6.0f}ms"
        )

        if acc > best_accuracy:
            best_accuracy = acc
            best_method = method_name

    print("-" * 80)
    print(f"\n🏆 WINNER: {best_method}")
    print(f"   Overall Accuracy: {best_accuracy:.1f}%")
    print(f"   Meets 95% target: {'YES ✅' if best_accuracy >= 95 else 'NO ❌'}")
    print("=" * 80)


def main():
    print("=" * 80)
    print("FULL OCR METHOD COMPARISON TEST")
    print("Methods: SimpleOCR (Tesseract) vs EasyOCR vs Combined Voting")
    print("=" * 80)

    # All recordings including new ones
    recordings = [
        (
            "examples/recordings/derived/screen-recording-20260322/frames",
            "Recording 1 (Mar 22)",
        ),
        (
            "examples/recordings/derived/screen-recording-20260323/frames",
            "Recording 2 (Mar 23)",
        ),
        (
            "examples/recordings/derived/screen-recording-20260323-2/frames",
            "Recording 3 (Mar 23-2)",
        ),
        (
            "examples/recordings/derived/screen-recording-20260323-3/frames",
            "Recording 4 (Mar 23-3) - NEW",
        ),
        (
            "examples/recordings/derived/screen-recording-20260324/frames",
            "Recording 5 (Mar 24) - NEW",
        ),
    ]

    all_results = {}

    for frames_dir, rec_name in recordings:
        print(f"\nTesting: {rec_name}")
        results = run_comparison(frames_dir, max_frames=30)
        all_results[rec_name] = results

    print_results(all_results)


if __name__ == "__main__":
    main()
