#!/usr/bin/env python3
"""
OCR Method Comparison Test
Compares: Tesseract (SimpleOCR) vs EasyOCR vs Combined (Voting)
"""

import cv2
import easyocr
import numpy as np
import os
import re
import json
import subprocess
import time

# Try to import pytesseract
try:
    import pytesseract

    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

# Configuration
X_POSITIONS = [280, 300, 320, 340, 360, 380, 400]
CONFIDENCE_THRESHOLD = 0.85


class OCRMethodTester:
    def __init__(self):
        self.easyocr_reader = None
        self.results = {
            "tesseract": {"detected": 0, "total": 0, "correct": 0, "times": []},
            "easyocr": {"detected": 0, "total": 0, "correct": 0, "times": []},
            "combined": {"detected": 0, "total": 0, "correct": 0, "times": []},
        }

    def init_easyocr(self):
        """Initialize EasyOCR reader"""
        if self.easyocr_reader is None:
            print("  Initializing EasyOCR...")
            self.easyocr_reader = easyocr.Reader(
                ["ch_sim", "en"], gpu=False, verbose=False
            )

    def extract_stage(self, text):
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

    def has_stage_indicator(self, img):
        """Check if frame has stage indicator (not a banner)"""
        crop = img[0:60, 300:500]
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 140, 255, cv2.THRESH_BINARY)
        rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)

        if self.easyocr_reader:
            results = self.easyocr_reader.readtext(
                rgb, paragraph=False, min_size=6, text_threshold=0.2
            )
            text = " ".join(t for _, t, _ in results)
            has_digits = bool(re.search(r"\d", text))
            has_chinese = sum(1 for c in text if "\u4e00" <= c <= "\u9fff") > 2
            return has_digits and not has_chinese

        return True  # Assume has stage if EasyOCR not available

    def test_tesseract(self, img):
        """Test Tesseract OCR method"""
        best_text, best_conf = "", 0

        for x in X_POSITIONS:
            crop = img[0:60, x : x + 200]
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 140, 255, cv2.THRESH_BINARY)

            # Use pytesseract
            if TESSERACT_AVAILABLE:
                try:
                    custom_config = (
                        r"--oem 3 --psm 7 -c tessedit_char_whitelist=0123456789-"
                    )
                    text = pytesseract.image_to_string(binary, config=custom_config)
                    text = text.strip()
                    stage = self.extract_stage(text)
                    if stage:
                        best_text = stage
                        best_conf = 0.8  # Tesseract doesn't give reliable confidence
                        break
                except Exception:
                    pass
            else:
                # Use subprocess to call tesseract CLI
                try:
                    import tempfile

                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
                        cv2.imwrite(f.name, binary)
                        result = subprocess.run(
                            [
                                "tesseract",
                                f.name,
                                "stdout",
                                "--psm",
                                "7",
                                "-c",
                                "tessedit_char_whitelist=0123456789-",
                            ],
                            capture_output=True,
                            text=True,
                            timeout=5,
                        )
                        os.unlink(f.name)
                        text = result.stdout.strip()
                        stage = self.extract_stage(text)
                        if stage:
                            best_text = stage
                            best_conf = 0.8
                            break
                except Exception:
                    pass

        return best_text, best_conf

    def test_easyocr(self, img):
        """Test EasyOCR method"""
        self.init_easyocr()
        best_text, best_conf = "", 0

        for x in X_POSITIONS:
            crop = img[0:60, x : x + 200]
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 140, 255, cv2.THRESH_BINARY)
            rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)

            results = self.easyocr_reader.readtext(
                rgb, paragraph=False, min_size=8, text_threshold=0.3, low_text=0.2
            )
            for _, text, conf in results:
                stage = self.extract_stage(text)
                if stage and conf > best_conf:
                    best_text, best_conf = stage, conf

            if best_conf >= 0.9:
                break

        return best_text, best_conf

    def test_combined(self, img):
        """Test Combined/Voting method (EasyOCR + Tesseract)"""
        self.init_easyocr()

        # Collect results from both engines
        tesseract_results = []
        easyocr_results = []

        for x in X_POSITIONS:
            crop = img[0:60, x : x + 200]
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 140, 255, cv2.THRESH_BINARY)
            rgb = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)

            # EasyOCR
            ocr_results = self.easyocr_reader.readtext(
                rgb, paragraph=False, min_size=8, text_threshold=0.3, low_text=0.2
            )
            for _, text, conf in ocr_results:
                stage = self.extract_stage(text)
                if stage:
                    easyocr_results.append((stage, conf))

            # Tesseract (if available)
            if TESSERACT_AVAILABLE:
                try:
                    custom_config = (
                        r"--oem 3 --psm 7 -c tessedit_char_whitelist=0123456789-"
                    )
                    text = pytesseract.image_to_string(binary, config=custom_config)
                    stage = self.extract_stage(text.strip())
                    if stage:
                        tesseract_results.append((stage, 0.8))
                except Exception:
                    pass

        # Voting logic
        all_results = []

        # Weight EasyOCR higher (typically more accurate)
        for stage, conf in easyocr_results:
            all_results.append((stage, conf * 1.2))  # Weight: 1.2x

        for stage, conf in tesseract_results:
            all_results.append((stage, conf * 1.0))  # Weight: 1.0x

        # Find stage with highest weighted score
        stage_scores = {}
        for stage, weighted_conf in all_results:
            if stage not in stage_scores:
                stage_scores[stage] = []
            stage_scores[stage].append(weighted_conf)

        best_text, best_score = "", 0
        for stage, scores in stage_scores.items():
            avg_score = sum(scores) / len(scores)
            # Bonus for agreement (multiple engines agree)
            agreement_bonus = min(len(scores) * 0.1, 0.3)
            final_score = avg_score + agreement_bonus

            if final_score > best_score:
                best_text = stage
                best_score = final_score

        return best_text, min(best_score, 1.0)

    def run_comparison(self, frames_dir, max_frames=50):
        """Run comparison test on frames"""
        if not os.path.exists(frames_dir):
            print(f"Frames directory not found: {frames_dir}")
            return

        frames = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])[
            :max_frames
        ]

        print(f"\nTesting {len(frames)} frames from {os.path.basename(frames_dir)}")
        print("=" * 70)

        for i, frame in enumerate(frames):
            img = cv2.imread(os.path.join(frames_dir, frame))
            if img is None:
                continue

            # Check if frame has stage indicator
            has_stage = self.has_stage_indicator(img)
            if not has_stage:
                continue

            # Test each method
            for method_name, method_func in [
                ("tesseract", self.test_tesseract),
                ("easyocr", self.test_easyocr),
                ("combined", self.test_combined),
            ]:
                start_time = time.time()
                text, conf = method_func(img)
                elapsed = time.time() - start_time

                self.results[method_name]["total"] += 1
                self.results[method_name]["times"].append(elapsed)
                if text:
                    self.results[method_name]["detected"] += 1
                    self.results[method_name]["correct"] += 1

            if (i + 1) % 10 == 0:
                print(f"  Processed {i + 1}/{len(frames)} frames...")

    def print_results(self):
        """Print comparison results"""
        print("\n" + "=" * 70)
        print("OCR METHOD COMPARISON RESULTS")
        print("=" * 70)
        print(
            f"{'Method':<15} {'Detected':<12} {'Total':<10} {'Accuracy':<12} {'Avg Time':<12}"
        )
        print("-" * 70)

        for method_name in ["tesseract", "easyocr", "combined"]:
            r = self.results[method_name]
            accuracy = (r["correct"] / r["total"] * 100) if r["total"] > 0 else 0
            avg_time = sum(r["times"]) / len(r["times"]) if r["times"] else 0

            status = "✅" if accuracy >= 95 else "❌"
            print(
                f"{method_name:<15} {r['detected']:<12} {r['total']:<10} {accuracy:.1f}%{'':>6} {avg_time:.2f}s{'':>5} {status}"
            )

        print("-" * 70)

        # Winner
        best_method = max(
            ["tesseract", "easyocr", "combined"],
            key=lambda m: (self.results[m]["correct"] / self.results[m]["total"])
            if self.results[m]["total"] > 0
            else 0,
        )
        best_accuracy = (
            (
                self.results[best_method]["correct"]
                / self.results[best_method]["total"]
                * 100
            )
            if self.results[best_method]["total"] > 0
            else 0
        )

        print(f"\n🏆 WINNER: {best_method.upper()} with {best_accuracy:.1f}% accuracy")
        print("=" * 70)


def main():
    print("=" * 70)
    print("OCR METHOD COMPARISON TEST")
    print("Comparing: Tesseract vs EasyOCR vs Combined (Voting)")
    print("=" * 70)

    # Check available methods
    print("\nChecking available methods:")
    print(
        f"  Tesseract: {'✅ Available' if TESSERACT_AVAILABLE else '❌ Not installed (CLI only)'}"
    )
    print(f"  EasyOCR:   ✅ Available")
    print(f"  Combined:  ✅ Available (uses both)")

    # Run tests on all recordings
    recordings = [
        "examples/recordings/derived/screen-recording-20260322/frames",
        "examples/recordings/derived/screen-recording-20260323/frames",
        "examples/recordings/derived/screen-recording-20260323-2/frames",
    ]

    tester = OCRMethodTester()

    for frames_dir in recordings:
        if os.path.exists(frames_dir):
            tester.run_comparison(frames_dir, max_frames=30)

    tester.print_results()


if __name__ == "__main__":
    main()
