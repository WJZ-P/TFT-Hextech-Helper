#!/usr/bin/env python3
"""
Template Extractor for TFT OCR
Extracts and learns digit templates from frames with known values.
"""

import cv2
import numpy as np
import os
import json
from pathlib import Path

# Create templates directory
TEMPLATE_DIR = Path("examples/templates/digits")
TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)

# Known frame values for template extraction
# Format: (frame_path, roi, expected_value, description)
KNOWN_VALUES = [
    # Gold values
    (
        "examples/recordings/derived/screen-recording-20260324/frames/frame_0101.jpg",
        (955, 420, 40, 40),
        55,
        "gold",
    ),
    (
        "examples/recordings/derived/screen-recording-20260324/frames/frame_0131.jpg",
        (955, 420, 40, 40),
        11,
        "gold",
    ),
    # Level values
    (
        "examples/recordings/derived/screen-recording-20260324/frames/frame_0101.jpg",
        (120, 445, 30, 28),
        6,
        "level",
    ),
    (
        "examples/recordings/derived/screen-recording-20260324/frames/frame_0071.jpg",
        (120, 445, 30, 28),
        3,
        "level",
    ),
    # HP values from sidebar
    (
        "examples/recordings/derived/screen-recording-20260324/frames/frame_0101.jpg",
        (940, 65, 45, 25),
        95,
        "hp",
    ),
    (
        "examples/recordings/derived/screen-recording-20260324/frames/frame_0101.jpg",
        (940, 105, 45, 25),
        84,
        "hp",
    ),
    # Shop costs
    ("examples/shop_candidate_0.jpg", (365, 158, 30, 25), 4, "cost"),
    ("examples/shop_candidate_0.jpg", (515, 158, 30, 25), 4, "cost"),
    ("examples/shop_candidate_0.jpg", (660, 158, 30, 25), 2, "cost"),
]


def preprocess_for_matching(image):
    """Preprocess image for digit template matching"""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    # Enhance contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Try multiple thresholding methods
    results = []

    # Method 1: Otsu
    _, otsu = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    results.append(("otsu", otsu))

    # Method 2: Adaptive
    adaptive = cv2.adaptiveThreshold(
        enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    results.append(("adaptive", adaptive))

    # Method 3: Inverted Otsu (for white text on dark)
    _, inv_otsu = cv2.threshold(
        enhanced, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )
    results.append(("inv_otsu", inv_otsu))

    # Method 4: High threshold (for bright text)
    _, high = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
    results.append(("high", high))

    return results


def segment_digits(binary_image):
    """Segment individual digits from binary image"""
    # Find contours
    contours, _ = cv2.findContours(
        binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    # Filter and sort contours left to right
    digit_boxes = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)

        # Filter noise (too small or too large)
        if w < 3 or h < 5 or w > 50 or h > 50:
            continue

        # Filter based on aspect ratio (digits are typically taller than wide)
        aspect = h / w if w > 0 else 0
        if aspect < 0.5 or aspect > 4:
            continue

        digit_boxes.append((x, y, w, h))

    # Sort by x position
    digit_boxes.sort(key=lambda b: b[0])

    return digit_boxes


def extract_digit_templates():
    """Extract digit templates from known frames"""
    print("=" * 70)
    print("DIGIT TEMPLATE EXTRACTION")
    print("=" * 70)

    digit_samples = {}  # digit -> list of images

    for frame_path, roi, expected_value, category in KNOWN_VALUES:
        if not os.path.exists(frame_path):
            print(f"Skipping {frame_path} - not found")
            continue

        img = cv2.imread(frame_path)
        if img is None:
            continue

        x, y, w, h = roi
        crop = img[y : y + h, x : x + w]

        if crop.size == 0:
            continue

        print(
            f"\nProcessing: {category}={expected_value} from {os.path.basename(frame_path)}"
        )

        # Get preprocessing variants
        variants = preprocess_for_matching(crop)

        expected_digits = list(str(expected_value))

        for method_name, binary in variants:
            digit_boxes = segment_digits(binary)

            if len(digit_boxes) == len(expected_digits):
                print(
                    f"  {method_name}: Found {len(digit_boxes)} digits (expected {len(expected_digits)})"
                )

                for i, (dx, dy, dw, dh) in enumerate(digit_boxes):
                    if i < len(expected_digits):
                        digit = expected_digits[i]

                        # Extract digit with padding
                        pad = 2
                        digit_crop = binary[
                            max(0, dy - pad) : min(binary.shape[0], dy + dh + pad),
                            max(0, dx - pad) : min(binary.shape[1], dx + dw + pad),
                        ]

                        if digit_crop.size > 0:
                            # Resize to standard size
                            resized = cv2.resize(digit_crop, (20, 35))

                            if digit not in digit_samples:
                                digit_samples[digit] = []
                            digit_samples[digit].append(resized)
            else:
                print(
                    f"  {method_name}: Found {len(digit_boxes)} digits (expected {len(expected_digits)}) - mismatch"
                )

    # Save best template for each digit
    print("\n" + "=" * 70)
    print("SAVING TEMPLATES")
    print("=" * 70)

    templates_info = {}

    for digit, samples in digit_samples.items():
        if len(samples) > 0:
            # Use the sample with highest contrast as the best template
            best_sample = max(samples, key=lambda s: np.std(s))

            template_path = TEMPLATE_DIR / f"digit_{digit}.png"
            cv2.imwrite(str(template_path), best_sample)

            templates_info[digit] = {
                "path": str(template_path),
                "samples": len(samples),
                "std": float(np.std(best_sample)),
            }

            print(
                f"Digit {digit}: {len(samples)} samples, saved best (std={np.std(best_sample):.1f})"
            )

    # Save templates info
    info_path = TEMPLATE_DIR / "templates_info.json"
    with open(info_path, "w") as f:
        json.dump(templates_info, f, indent=2)

    print(f"\nTemplates saved to {TEMPLATE_DIR}")
    print(f"Info saved to {info_path}")

    return templates_info


def test_templates():
    """Test the extracted templates on known frames"""
    print("\n" + "=" * 70)
    print("TESTING TEMPLATES")
    print("=" * 70)

    # Load templates
    templates = {}
    for digit in range(10):
        template_path = TEMPLATE_DIR / f"digit_{digit}.png"
        if template_path.exists():
            templates[str(digit)] = cv2.imread(str(template_path), cv2.IMREAD_GRAYSCALE)

    if not templates:
        print("No templates found!")
        return

    print(f"Loaded {len(templates)} templates")

    # Test on each known frame
    correct = 0
    total = 0

    for frame_path, roi, expected_value, category in KNOWN_VALUES:
        if not os.path.exists(frame_path):
            continue

        img = cv2.imread(frame_path)
        if img is None:
            continue

        x, y, w, h = roi
        crop = img[y : y + h, x : x + w]

        if crop.size == 0:
            continue

        # Preprocess
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Segment digits
        digit_boxes = segment_digits(binary)

        # Match each digit
        matched_digits = []
        for dx, dy, dw, dh in digit_boxes:
            digit_crop = binary[dy : dy + dh, dx : dx + dw]
            resized = cv2.resize(digit_crop, (20, 35))

            best_digit = None
            best_score = 0

            for digit_name, template in templates.items():
                if (
                    template.shape[0] > resized.shape[0]
                    or template.shape[1] > resized.shape[1]
                ):
                    continue

                result = cv2.matchTemplate(resized, template, cv2.TM_CCOEFF_NORMED)
                _, max_val, _, _ = cv2.minMaxLoc(result)

                if max_val > best_score:
                    best_score = max_val
                    best_digit = digit_name

            if best_score > 0.5:
                matched_digits.append(best_digit)

        predicted = int("".join(matched_digits)) if matched_digits else None
        is_correct = predicted == expected_value

        total += 1
        if is_correct:
            correct += 1

        status = "✓" if is_correct else "✗"
        print(f"  {category}: expected={expected_value}, got={predicted} {status}")

    print(f"\nAccuracy: {correct}/{total} = {correct / total * 100:.0f}%")


if __name__ == "__main__":
    # Step 1: Extract templates
    templates_info = extract_digit_templates()

    # Step 2: Test templates
    test_templates()
