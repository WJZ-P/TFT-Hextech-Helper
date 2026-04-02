#!/usr/bin/env python3
"""
EasyOCR Bridge — Command-line OCR interface for Node.js integration

Usage:
    python easyocr_bridge.py <image_path> [--roi x,y,w,h] [--grayscale] [--threshold N]

Output JSON format:
    {
        "text": "recognized text",
        "confidence": 0.95,
        "regions": [
            {"text": "...", "confidence": 0.9, "x": 0, "y": 0, "width": 100, "height": 20},
            ...
        ]
    }

Error format:
    {"error": "error message", "details": "..."}
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import cv2
    import easyocr
    import numpy as np

    EASYOCR_AVAILABLE = True
except ImportError as e:
    EASYOCR_AVAILABLE = False
    print(
        json.dumps({"error": "Missing dependencies", "details": str(e)}),
        file=sys.stderr,
    )
    sys.exit(1)


class EasyOCRBridge:
    """EasyOCR bridge for Node.js integration"""

    def __init__(self, languages: list[str] = None, gpu: bool = False):
        if languages is None:
            languages = ["ch_sim", "en"]
        self.languages = languages
        self.gpu = gpu
        self._reader = None

    def initialize(self) -> None:
        """Initialize the EasyOCR reader"""
        if self._reader is None:
            self._reader = easyocr.Reader(
                self.languages,
                gpu=self.gpu,
                verbose=False,
                model_storage_directory=None,
            )

    def preprocess_image(
        self, image: np.ndarray, grayscale: bool = False, threshold_value: int = None
    ) -> np.ndarray:
        """Apply preprocessing to the image"""
        processed = image.copy()

        if grayscale:
            if len(processed.shape) == 3:
                processed = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)

        if threshold_value is not None:
            if len(processed.shape) == 2:
                _, processed = cv2.threshold(
                    processed, threshold_value, 255, cv2.THRESH_BINARY_INV
                )
            else:
                gray = cv2.cvtColor(processed, cv2.COLOR_BGR2GRAY)
                _, processed = cv2.threshold(
                    gray, threshold_value, 255, cv2.THRESH_BINARY_INV
                )

        return processed

    def crop_roi(
        self, image: np.ndarray, x: int, y: int, width: int, height: int
    ) -> np.ndarray:
        """Crop a region of interest from the image"""
        h, w = image.shape[:2]
        x1 = max(0, min(x, w - 1))
        y1 = max(0, min(y, h - 1))
        x2 = max(0, min(x + width, w))
        y2 = max(0, min(y + height, h))
        return image[y1:y2, x1:x2]

    def extract_stage_text(self, text: str) -> str | None:
        """
        Extract stage text (X-Y format) from OCR output.

        Handles common issues:
        - Missing hyphens: '41' → '4-1', '45' → '4-5'
        - Chinese character prefixes: '岳3-2' → '3-2'
        - Various hyphen types: — – － → -
        """
        if not text:
            return None

        # Remove Chinese characters
        cleaned = "".join(c for c in text if not ("\u4e00" <= c <= "\u9fff"))

        # Normalize hyphens
        cleaned = cleaned.replace("—", "-").replace("–", "-").replace("－", "-")

        # Keep only digits and hyphens
        cleaned = "".join(c for c in cleaned if c.isdigit() or c == "-")

        # Try direct X-Y match first
        import re

        match = re.search(r"(\d)-(\d)", cleaned)
        if match:
            stage, round_num = int(match.group(1)), int(match.group(2))
            if 1 <= stage <= 7 and 1 <= round_num <= 7:
                return match.group(0)

        # Try to find consecutive digits and insert hyphen
        digits = re.findall(r"\d", cleaned)
        if len(digits) >= 2:
            # Try first two digits
            stage, round_num = int(digits[0]), int(digits[1])
            if 1 <= stage <= 7 and 1 <= round_num <= 7:
                return f"{stage}-{round_num}"
            # Try last two digits
            stage, round_num = int(digits[-2]), int(digits[-1])
            if 1 <= stage <= 7 and 1 <= round_num <= 7:
                return f"{stage}-{round_num}"

        return None

    def recognize(
        self,
        image_path: str,
        roi: tuple[int, int, int, int] = None,
        grayscale: bool = False,
        threshold_value: int = None,
        extract_stage: bool = False,
    ) -> dict:
        """
        Perform OCR on an image.

        Args:
            image_path: Path to the image file
            roi: Optional ROI as (x, y, width, height)
            grayscale: Apply grayscale preprocessing
            threshold_value: Apply thresholding with this value

        Returns:
            Dict with text, confidence, and regions
        """
        try:
            # Read image
            image = cv2.imread(str(image_path))
            if image is None:
                return {
                    "error": "Failed to read image",
                    "details": f"Could not load: {image_path}",
                }

            # Apply ROI cropping
            if roi is not None:
                x, y, w, h = roi
                image = self.crop_roi(image, x, y, w, h)

            # Apply preprocessing
            processed = self.preprocess_image(image, grayscale, threshold_value)

            # Convert to RGB (EasyOCR expects RGB)
            if len(processed.shape) == 2:
                rgb = cv2.cvtColor(processed, cv2.COLOR_GRAY2RGB)
            else:
                rgb = cv2.cvtColor(processed, cv2.COLOR_BGR2RGB)

            # Perform OCR
            results = self._reader.readtext(
                rgb, paragraph=False, min_size=10, text_threshold=0.3, low_text=0.2
            )

            # Parse results
            regions = []
            all_text = []
            total_confidence = 0.0

            for bbox, text, confidence in results:
                text = text.strip()
                if not text:
                    continue

                # Convert bbox points to x, y, width, height
                points = np.array(bbox)
                x_coords = points[:, 0]
                y_coords = points[:, 1]
                x = int(x_coords.min())
                y = int(y_coords.min())
                width = int(x_coords.max() - x_coords.min())
                height = int(y_coords.max() - y_coords.min())

                regions.append(
                    {
                        "text": text,
                        "confidence": float(confidence),
                        "x": x,
                        "y": y,
                        "width": width,
                        "height": height,
                    }
                )

                all_text.append(text)
                total_confidence += confidence

            # Calculate average confidence
            avg_confidence = total_confidence / len(regions) if regions else 0.0

            return {
                "text": " ".join(all_text),
                "confidence": float(avg_confidence),
                "regions": regions,
            }

        except Exception as e:
            return {"error": "OCR processing failed", "details": str(e)}


def parse_roi(value: str) -> tuple[int, int, int, int] | None:
    """Parse ROI string in format 'x,y,w,h'"""
    if not value:
        return None
    try:
        parts = [int(p.strip()) for p in value.split(",")]
        if len(parts) != 4:
            raise ValueError("ROI must have 4 values: x,y,w,h")
        return (parts[0], parts[1], parts[2], parts[3])
    except ValueError as e:
        raise argparse.ArgumentTypeError(f"Invalid ROI format: {value}. Use x,y,w,h")


def recognize_batch(
    bridge: "EasyOCRBridge",
    image_paths: list[str],
    roi: tuple[int, int, int, int] = None,
    grayscale: bool = False,
    threshold_value: int = None,
) -> list[dict]:
    """
    Perform OCR on multiple images.

    Args:
        bridge: Initialized EasyOCRBridge instance
        image_paths: List of paths to image files
        roi: Optional ROI as (x, y, width, height)
        grayscale: Apply grayscale preprocessing
        threshold_value: Apply thresholding with this value

    Returns:
        List of dicts with text, confidence, and regions for each image
    """
    results = []
    for image_path in image_paths:
        result = bridge.recognize(image_path, roi, grayscale, threshold_value)
        result["image_path"] = image_path
        results.append(result)
    return results


def main():
    parser = argparse.ArgumentParser(
        description="EasyOCR Bridge for Node.js integration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python easyocr_bridge.py image.png
    python easyocr_bridge.py image.png --roi 100,50,200,100
    python easyocr_bridge.py image.png --grayscale --threshold 128
    python easyocr_bridge.py image.png --roi 0,0,500,200 --grayscale
    
Batch mode (multiple images):
    python easyocr_bridge.py image1.png image2.png image3.png
    python easyocr_bridge.py --batch img1.png img2.png img3.png --roi 280,0,200,60
        """,
    )

    parser.add_argument(
        "image_paths", type=str, nargs="*", help="Path(s) to the image file(s) for OCR"
    )

    parser.add_argument(
        "--batch",
        type=str,
        nargs="+",
        dest="batch_paths",
        help="Batch mode: process multiple images",
    )

    parser.add_argument(
        "--roi", type=parse_roi, default=None, help="Region of interest as 'x,y,w,h'"
    )

    parser.add_argument(
        "--grayscale", action="store_true", help="Apply grayscale preprocessing"
    )

    parser.add_argument(
        "--threshold",
        type=int,
        default=None,
        help="Apply binary thresholding with this value (0-255)",
    )

    parser.add_argument(
        "--gpu", action="store_true", help="Use GPU acceleration (if available)"
    )

    parser.add_argument(
        "--languages",
        type=str,
        default="ch_sim,en",
        help="Comma-separated list of languages (default: ch_sim,en)",
    )

    args = parser.parse_args()

    # Determine image paths (positional or --batch)
    image_paths = args.batch_paths or args.image_paths
    if not image_paths:
        parser.error("Provide image path(s) as arguments or use --batch")

    # Validate image paths
    for p in image_paths:
        if not Path(p).exists():
            print(
                json.dumps({"error": "Image file not found", "details": str(p)}),
                file=sys.stderr,
            )
            sys.exit(1)

    # Parse languages
    languages = [lang.strip() for lang in args.languages.split(",")]

    # Initialize bridge
    bridge = EasyOCRBridge(languages=languages, gpu=args.gpu)

    try:
        bridge.initialize()
    except Exception as e:
        print(
            json.dumps({"error": "Failed to initialize EasyOCR", "details": str(e)}),
            file=sys.stderr,
        )
        sys.exit(1)

    # Perform OCR (single or batch)
    if len(image_paths) == 1:
        result = bridge.recognize(
            image_paths[0],
            roi=args.roi,
            grayscale=args.grayscale,
            threshold_value=args.threshold,
        )
        print(json.dumps(result, ensure_ascii=False))
    else:
        results = recognize_batch(
            bridge,
            image_paths,
            roi=args.roi,
            grayscale=args.grayscale,
            threshold_value=args.threshold,
        )
        print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
