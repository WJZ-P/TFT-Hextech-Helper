#!/usr/bin/env python3
"""
Improved OCR Benchmark - Center-relative positioning + No-stage detection
Target: 95% accuracy on frames that HAVE stage indicators
"""

import cv2
import easyocr
import numpy as np
import json
import os
import sys
from pathlib import Path
from typing import Optional

# Configuration (parameters that work)
MIN_SIZE = 10
TEXT_THRESHOLD = 0.3
LOW_TEXT = 0.2

# Position range (absolute X positions that work)
X_POSITIONS = [300, 320, 340, 360, 380, 400, 420]
CROP_WIDTH = 200
CROP_HEIGHT = 60
CROP_Y_START = 0  # y=0 works best based on testing

# Preprocessing variants (threshold 140 works best based on testing)
PREPROCESS_VARIANTS = [
    {"name": "thresh_140", "grayscale": True, "threshold": 140},
    {"name": "thresh_120", "grayscale": True, "threshold": 120},
    {"name": "thresh_160", "grayscale": True, "threshold": 160},
    {"name": "gray_only", "grayscale": True, "threshold": None},
]

# Known banner text that indicates no stage is visible
KNOWN_BANNERS = ["战斗环节", "准备环节", "商店", "刷新", "购买", "卖出"]


class ImprovedOCRBenchmark:
    def __init__(self):
        self.reader = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)

    def detect_image_center(self, image: np.ndarray) -> int:
        """Get center X coordinate of image"""
        return image.shape[1] // 2

    def get_scan_positions(self) -> list[int]:
        """Get X positions for scanning (absolute positions that work)"""
        return X_POSITIONS

    def crop_region(
        self, image: np.ndarray, x: int, y: int, w: int, h: int
    ) -> np.ndarray:
        """Safely crop a region from image"""
        img_h, img_w = image.shape[:2]
        x1 = max(0, min(x, img_w - 1))
        y1 = max(0, min(y, img_h - 1))
        x2 = max(0, min(x + w, img_w))
        y2 = max(0, min(y + h, img_h))
        return image[y1:y2, x1:x2]

    def preprocess(self, crop: np.ndarray, variant: dict) -> np.ndarray:
        """Apply preprocessing variant to crop"""
        processed = crop.copy()

        # Grayscale
        if variant.get("grayscale") and len(processed.shape) == 3:
            processed = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)

        # CLAHE
        if variant.get("clahe"):
            if len(processed.shape) == 3:
                processed = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            processed = clahe.apply(processed)

        # Normalize
        if variant.get("normalize"):
            processed = cv2.normalize(processed, None, 0, 255, cv2.NORM_MINMAX)

        # Threshold
        threshold = variant.get("threshold")
        if threshold is not None:
            if len(processed.shape) == 3:
                processed = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)
            _, processed = cv2.threshold(processed, threshold, 255, cv2.THRESH_BINARY)

        # Sharpen
        if variant.get("sharpen"):
            kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
            processed = cv2.filter2D(processed, -1, kernel)

        return processed

    def extract_stage_text(self, text: str) -> Optional[str]:
        """Extract stage text (X-Y format) from OCR output"""
        if not text:
            return None

        # Normalize
        normalized = text.replace("—", "-").replace("–", "-").replace("－", "-")
        normalized = "".join(c for c in normalized if c.isdigit() or c == "-")
        normalized = normalized.replace(" ", "")

        # Match X-Y pattern
        import re

        match = re.search(r"(\d)-(\d)", normalized)
        if match:
            stage, round_num = int(match.group(1)), int(match.group(2))
            if 1 <= stage <= 7 and 1 <= round_num <= 7:
                return f"{stage}-{round_num}"

        return None

    def is_stage_format(self, text: str) -> bool:
        """Check if text looks like stage format"""
        import re

        return bool(re.search(r"\d-\d", text))

    def is_banner_text(self, text: str) -> bool:
        """Check if text is a known banner (no stage)"""
        for banner in KNOWN_BANNERS:
            if banner in text:
                return True
        # Check if text is mostly Chinese characters (banners)
        chinese_chars = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
        return chinese_chars > len(text) * 0.5

    def has_digit_hyphen(self, results: list) -> bool:
        """Check if any OCR result contains digit-hyphen pattern"""
        for _, text, conf in results:
            if self.is_stage_format(text):
                return True
        return False

    def classify_frame_type(self, crop: np.ndarray) -> str:
        """Classify if crop likely has stage indicator or is a banner/no-stage"""
        # Run OCR with broad settings
        rgb = (
            cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            if len(crop.shape) == 3
            else cv2.cvtColor(crop, cv2.COLOR_GRAY2RGB)
        )
        results = self.reader.readtext(
            rgb, paragraph=False, min_size=6, text_threshold=0.2
        )

        all_text = " ".join(text for _, text, _ in results)

        if self.has_digit_hyphen(results):
            return "has_stage"
        elif self.is_banner_text(all_text):
            return "banner"
        elif len(results) == 0:
            return "empty"
        else:
            return "other"

    def ocr_single_crop(self, crop: np.ndarray) -> dict:
        """Run OCR on a single crop with all variants, return best result"""
        best_text = ""
        best_confidence = 0
        best_variant = ""

        for variant in PREPROCESS_VARIANTS:
            try:
                processed = self.preprocess(crop, variant)

                # Convert to RGB for EasyOCR
                if len(processed.shape) == 2:
                    rgb = cv2.cvtColor(processed, cv2.COLOR_GRAY2RGB)
                else:
                    rgb = cv2.cvtColor(processed, cv2.COLOR_BGR2RGB)

                results = self.reader.readtext(
                    rgb,
                    paragraph=False,
                    min_size=MIN_SIZE,
                    text_threshold=TEXT_THRESHOLD,
                    low_text=LOW_TEXT,
                )

                # Aggregate text
                texts = [text for _, text, _ in results if text.strip()]
                confidences = [conf for _, _, conf in results if results]

                if texts:
                    combined_text = " ".join(texts)
                    avg_conf = np.mean(confidences) if confidences else 0

                    stage = self.extract_stage_text(combined_text)
                    if stage and avg_conf > best_confidence:
                        best_text = stage
                        best_confidence = avg_conf
                        best_variant = variant["name"]
            except Exception:
                pass

        return {
            "text": best_text,
            "confidence": best_confidence,
            "variant": best_variant,
        }

    def scan_frame(self, image_path: str) -> dict:
        """Scan a single frame and return results"""
        image = cv2.imread(image_path)
        if image is None:
            return {"error": "Cannot read image", "path": image_path}

        positions = self.get_scan_positions()

        # First, check if this frame has a stage indicator
        # Use a quick classification on the center crop
        center_x = self.detect_image_center(image)
        center_crop = self.crop_region(
            image, center_x - 50, CROP_Y_START, 100, CROP_HEIGHT
        )
        frame_type = self.classify_frame_type(center_crop)

        if frame_type == "banner":
            return {
                "path": image_path,
                "frame_type": "banner",
                "has_stage": False,
                "text": "",
                "confidence": 0,
                "positions_tested": 0,
            }

        # Scan all positions
        best_text = ""
        best_confidence = 0
        best_position = 0
        positions_tested = 0

        for x in positions:
            crop = self.crop_region(image, x, CROP_Y_START, CROP_WIDTH, CROP_HEIGHT)
            if crop.size == 0:
                continue

            positions_tested += 1
            result = self.ocr_single_crop(crop)

            if result["confidence"] > best_confidence:
                best_text = result["text"]
                best_confidence = result["confidence"]
                best_position = x

        has_stage = bool(best_text)

        return {
            "path": image_path,
            "frame_type": "has_stage" if has_stage else "no_stage",
            "has_stage": has_stage,
            "text": best_text,
            "confidence": best_confidence,
            "best_position": best_position,
            "positions_tested": positions_tested,
            "image_width": image.shape[1],
            "center_x": center_x,
        }

    def run_benchmark(self, frames_dir: str, max_frames: int = 200) -> dict:
        """Run benchmark on frames directory"""
        frames = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])
        frames = frames[:max_frames]

        results = {
            "total_frames": len(frames),
            "has_stage": 0,
            "no_stage": 0,
            "detected": 0,
            "missed": 0,
            "details": [],
        }

        print(f"Processing {len(frames)} frames from {frames_dir}...")

        for i, frame in enumerate(frames):
            if (i + 1) % 10 == 0:
                print(f"  Progress: {i + 1}/{len(frames)}")

            path = os.path.join(frames_dir, frame)
            result = self.scan_frame(path)
            results["details"].append(result)

            if result.get("has_stage"):
                results["has_stage"] += 1
                if result.get("text"):
                    results["detected"] += 1
                else:
                    results["missed"] += 1
            else:
                results["no_stage"] += 1

        # Calculate accuracy (only on frames with stage)
        if results["has_stage"] > 0:
            results["accuracy"] = results["detected"] / results["has_stage"] * 100
        else:
            results["accuracy"] = 0

        results["stage_detection_rate"] = (
            results["has_stage"] / results["total_frames"] * 100
        )

        return results


def main():
    frames_dir = "examples/recordings/derived/screen-recording-20260322/frames"

    if not os.path.exists(frames_dir):
        print(f"Frames directory not found: {frames_dir}")
        sys.exit(1)

    benchmark = ImprovedOCRBenchmark()
    results = benchmark.run_benchmark(frames_dir, max_frames=100)

    print("\n" + "=" * 60)
    print("BENCHMARK RESULTS")
    print("=" * 60)
    print(f"Total frames analyzed: {results['total_frames']}")
    print(
        f"Frames with stage indicator: {results['has_stage']} ({results['stage_detection_rate']:.1f}%)"
    )
    print(f"Frames without stage (banners/other): {results['no_stage']}")
    print(f"")
    print(f"Accuracy (on frames WITH stage): {results['accuracy']:.1f}%")
    print(f"  - Correctly detected: {results['detected']}")
    print(f"  - Missed: {results['missed']}")
    print(f"")

    # Position distribution
    position_counts = {}
    for d in results["details"]:
        if d.get("has_stage") and d.get("text"):
            pos = d.get("best_position", 0)
            position_counts[pos] = position_counts.get(pos, 0) + 1

    if position_counts:
        print("Best position distribution:")
        for pos, count in sorted(position_counts.items()):
            print(f"  x={pos}: {count} detections")

    # Save results
    output_path = "examples/ocr-benchmark-improved.json"
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nDetailed results saved to: {output_path}")


if __name__ == "__main__":
    main()
