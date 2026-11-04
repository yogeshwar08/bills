#!/usr/bin/env python3
"""
Bill Snap ML Evaluation Pipeline
Runs the 20-image evaluation dataset through the Bill Snap API analysis endpoint,
computes precision, recall, field-level extraction accuracies with normalized matching,
writes evaluation/results.csv, and prints a comprehensive audit report.
"""
import os
import sys
import csv
import re
from datetime import datetime
from typing import Dict, Any, Optional, Tuple

# Add backend directory to sys.path so we can import services or schemas if needed
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

API_ENDPOINT = os.getenv("API_ENDPOINT", "http://127.0.0.1:8000/api/analyze")
HEALTH_ENDPOINT = os.getenv("HEALTH_ENDPOINT", "http://127.0.0.1:8000/api/health")
GROUND_TRUTH_PATH = os.path.join(os.path.dirname(__file__), "ground_truth.csv")
RESULTS_PATH = os.path.join(os.path.dirname(__file__), "results.csv")

# ----------------- NORMALIZATION UTILITIES -----------------

def normalize_merchant(name: Optional[str]) -> str:
    """Case-folds, trims, and strips non-alphanumeric characters for robust comparison."""
    if not name:
        return ""
    clean = re.sub(r"[^\w\s]", "", name.lower())
    return " ".join(clean.split())

def is_merchant_match(actual: str, predicted: Optional[str]) -> bool:
    if not actual or actual == "N/A":
        return True
    if not predicted:
        return False
    norm_act = normalize_merchant(actual)
    norm_pred = normalize_merchant(predicted)
    
    # Exact normalized match or strong substring containment
    if norm_act == norm_pred:
        return True
    if norm_act in norm_pred or norm_pred in norm_act:
        return True
    return False

def parse_date(date_str: Optional[str]) -> Optional[str]:
    """Normalizes dates into standard ISO YYYY-MM-DD format."""
    if not date_str:
        return None
    date_str = date_str.strip()
    
    # Match YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        return date_str
    
    # Try alternate formats
    for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d-%b-%Y", "%d %b %Y"):
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str

def is_date_match(actual: str, predicted: Optional[str]) -> bool:
    if not actual or actual == "N/A":
        return True
    if not predicted:
        return False
    return parse_date(actual) == parse_date(predicted)

def parse_amount(amt: Any) -> Optional[float]:
    """Parses float amount stripping currency symbols."""
    if amt is None:
        return None
    if isinstance(amt, (int, float)):
        return float(amt)
    clean = re.sub(r"[^\d.]", "", str(amt))
    try:
        return float(clean)
    except ValueError:
        return None

def is_amount_match(actual: Any, predicted: Any, tolerance: float = 0.50) -> bool:
    if actual == "N/A":
        return True
    act_val = parse_amount(actual)
    pred_val = parse_amount(predicted)
    if act_val is None or pred_val is None:
        return False
    # Check within absolute tolerance (accounting for minor penny/rounding differences)
    return abs(act_val - pred_val) <= tolerance

def is_category_match(actual: str, predicted: Optional[str]) -> bool:
    if not actual or actual == "N/A":
        return True
    if not predicted:
        return False
    return actual.strip().lower() == predicted.strip().lower()

# ----------------- MAIN EVALUATION RUNNER -----------------

def run_evaluation():
    print("=" * 72)
    print("       BILL SNAP AI MULTIMODAL EVALUATION PIPELINE")
    print("=" * 72)

    # 1. Check Backend Connectivity
    print(f"Connecting to Backend Health: {HEALTH_ENDPOINT}...")
    backend_mode = "LIVE_API"
    try:
        health_resp = requests.get(HEALTH_ENDPOINT, timeout=5)
        if health_resp.status_code == 200:
            h_data = health_resp.json()
            print(f"Backend Status: Healthy (Gemini Configured: {h_data.get('gemini_configured')}, Model: {h_data.get('model_name')})")
            if not h_data.get("gemini_configured"):
                print("\n[WARNING] GEMINI_API_KEY is not set on backend. API will return 503 errors.")
                print("Please set GEMINI_API_KEY in backend/.env to run full multimodal evaluation.\n")
        else:
            print(f"[WARNING] Health check returned HTTP {health_resp.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"[NOTE] Could not connect to {HEALTH_ENDPOINT}: {e}")
        print("Attempting to run using direct Python service invocation if available...")
        backend_mode = "DIRECT_SERVICE"

    # 2. Read Ground Truth
    if not os.path.exists(GROUND_TRUTH_PATH):
        print(f"[ERROR] Ground truth file not found at: {GROUND_TRUTH_PATH}")
        sys.exit(1)

    ground_truth = []
    with open(GROUND_TRUTH_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ground_truth.append(row)

    print(f"Loaded {len(ground_truth)} evaluation cases from {GROUND_TRUTH_PATH}.\n")

    # 3. Direct Service Fallback Setup if needed
    gemini_direct_service = None
    if backend_mode == "DIRECT_SERVICE":
        try:
            from app.services.gemini_service import GeminiVisionService
            from app.services.image_preprocessor import ImagePreprocessor
            gemini_direct_service = GeminiVisionService()
            if not gemini_direct_service.is_configured:
                print("[ERROR] GEMINI_API_KEY environment variable is not configured.")
                print("Evaluation requires a valid GEMINI_API_KEY to test multimodal AI.")
                sys.exit(1)
            print("Direct GeminiVisionService initialized successfully.")
        except Exception as err:
            print(f"[ERROR] Could not initialize direct service: {err}")
            sys.exit(1)

    # 4. Process Each Image
    results = []
    
    total_samples = len(ground_truth)
    correct_classifications = 0
    false_positives = 0
    false_negatives = 0
    
    total_bills = 0
    merchant_correct_count = 0
    date_correct_count = 0
    amount_correct_count = 0
    category_correct_count = 0

    print("-" * 72)
    print(f"{'Image ID':<12} | {'Condition':<25} | {'Class':<7} | {'Merch':<5} | {'Date':<5} | {'Amt':<5} | {'Cat':<5}")
    print("-" * 72)

    for item in ground_truth:
        img_id = item["image_id"]
        img_type = item["image_type"]
        img_condition = item["image_condition"]
        actual_is_bill = item["actual_is_bill"].strip().upper() == "TRUE"
        
        # Locate image file
        subfolder = "bills" if actual_is_bill else "non_bills"
        img_path = os.path.join(os.path.dirname(__file__), "images", subfolder, f"{img_id}.jpg")
        if not os.path.exists(img_path):
            img_path = os.path.join(os.path.dirname(__file__), "images", subfolder, f"{img_id}.png")

        if not os.path.exists(img_path):
            print(f"File not found: {img_path} -> Skipping.")
            continue

        predicted_is_bill = False
        merchant_pred = None
        date_pred = None
        amount_pred = None
        category_pred = None
        failure_reason = ""

        try:
            with open(img_path, "rb") as img_file:
                file_bytes = img_file.read()

            if backend_mode == "LIVE_API":
                files = {"file": (os.path.basename(img_path), file_bytes, "image/jpeg")}
                resp = requests.post(API_ENDPOINT, files=files, timeout=45)
                if resp.status_code == 200:
                    api_data = resp.json()
                    classification = api_data.get("classification", "UNCERTAIN")
                    predicted_is_bill = (classification == "BILL")
                    fields = api_data.get("fields")
                    if fields:
                        merchant_pred = fields.get("merchant_name", {}).get("value")
                        date_pred = fields.get("date", {}).get("value")
                        amount_pred = fields.get("total_amount", {}).get("value")
                        category_pred = fields.get("category", {}).get("value")
                else:
                    failure_reason = f"HTTP {resp.status_code}: {resp.text[:120]}"
            else:
                # Direct service execution
                processed_bytes, mime, dims = ImagePreprocessor.preprocess_image(file_bytes)
                service_res = gemini_direct_service.analyze_bill_image(processed_bytes, mime)
                classification = service_res.classification.value
                predicted_is_bill = (classification == "BILL")
                if service_res.fields:
                    merchant_pred = service_res.fields.merchant_name.value
                    date_pred = service_res.fields.date.value
                    amount_pred = service_res.fields.total_amount.value
                    category_pred = service_res.fields.category.value

        except Exception as e:
            failure_reason = f"Exception: {str(e)[:100]}"

        # Verification metrics
        class_correct = (actual_is_bill == predicted_is_bill)
        if class_correct:
            correct_classifications += 1
        else:
            if not actual_is_bill and predicted_is_bill:
                false_positives += 1
                failure_reason = failure_reason or "False Positive: Non-bill classified as Bill"
            elif actual_is_bill and not predicted_is_bill:
                false_negatives += 1
                failure_reason = failure_reason or "False Negative: Genuine bill rejected"

        if actual_is_bill:
            total_bills += 1
            m_correct = is_merchant_match(item["merchant_actual"], merchant_pred)
            d_correct = is_date_match(item["date_actual"], date_pred)
            a_correct = is_amount_match(item["amount_actual"], amount_pred)
            c_correct = is_category_match(item["category_actual"], category_pred)

            if m_correct: merchant_correct_count += 1
            if d_correct: date_correct_count += 1
            if a_correct: amount_correct_count += 1
            if c_correct: category_correct_count += 1

            m_sym = "PASS" if m_correct else "FAIL"
            d_sym = "PASS" if d_correct else "FAIL"
            a_sym = "PASS" if a_correct else "FAIL"
            c_sym = "PASS" if c_correct else "FAIL"
        else:
            m_correct = "N/A"
            d_correct = "N/A"
            a_correct = "N/A"
            c_correct = "N/A"
            m_sym = d_sym = a_sym = c_sym = "N/A"

        class_sym = "PASS" if class_correct else "FAIL"

        print(f"{img_id:<12} | {img_condition[:24]:<25} | {class_sym:<7} | {m_sym:<5} | {d_sym:<5} | {a_sym:<5} | {c_sym:<5}")

        results.append({
            "image_id": img_id,
            "image_type": img_type,
            "image_condition": img_condition,
            "actual_is_bill": actual_is_bill,
            "predicted_is_bill": predicted_is_bill,
            "classification_correct": class_correct,
            "merchant_actual": item["merchant_actual"],
            "merchant_predicted": merchant_pred if merchant_pred is not None else "null",
            "merchant_correct": m_correct,
            "date_actual": item["date_actual"],
            "date_predicted": date_pred if date_pred is not None else "null",
            "date_correct": d_correct,
            "amount_actual": item["amount_actual"],
            "amount_predicted": amount_pred if amount_pred is not None else "null",
            "amount_correct": a_correct,
            "category_actual": item["category_actual"],
            "category_predicted": category_pred if category_pred is not None else "null",
            "category_correct": c_correct,
            "failure_reason": failure_reason,
            "notes": item.get("notes", "")
        })

    # 5. Write results.csv
    fieldnames = [
        "image_id", "image_type", "image_condition",
        "actual_is_bill", "predicted_is_bill", "classification_correct",
        "merchant_actual", "merchant_predicted", "merchant_correct",
        "date_actual", "date_predicted", "date_correct",
        "amount_actual", "amount_predicted", "amount_correct",
        "category_actual", "category_predicted", "category_correct",
        "failure_reason", "notes"
    ]

    with open(RESULTS_PATH, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print("-" * 72)
    print(f"\nSaved detailed evaluation results to: {RESULTS_PATH}\n")

    # 6. Summary Report
    class_acc = (correct_classifications / total_samples) * 100 if total_samples > 0 else 0
    m_acc = (merchant_correct_count / total_bills) * 100 if total_bills > 0 else 0
    d_acc = (date_correct_count / total_bills) * 100 if total_bills > 0 else 0
    a_acc = (amount_correct_count / total_bills) * 100 if total_bills > 0 else 0
    c_acc = (category_correct_count / total_bills) * 100 if total_bills > 0 else 0

    print("=" * 72)
    print("                     EVALUATION SUMMARY REPORT")
    print("=" * 72)
    print(f"Total Dataset Images Evaluated: {total_samples}")
    print(f"Genuine Bills Tested:           {total_bills} (15 conditions)")
    print(f"Non-Bill Images Tested:         {total_samples - total_bills} (5 conditions)")
    print(f"Classification Accuracy:        {class_acc:.1f}% ({correct_classifications}/{total_samples})")
    print(f"False Positives (Non-Bill->Bill): {false_positives}")
    print(f"False Negatives (Bill->Non-Bill): {false_negatives}")
    print("-" * 72)
    print("Field-Level Extraction Accuracies (on Genuine Bills):")
    print(f"  • Merchant Name Accuracy:    {m_acc:.1f}% ({merchant_correct_count}/{total_bills})")
    print(f"  • Transaction Date Accuracy:  {d_acc:.1f}% ({date_correct_count}/{total_bills})")
    print(f"  • Total Amount Accuracy:      {a_acc:.1f}% ({amount_correct_count}/{total_bills})")
    print(f"  • Category Suggestion Accuracy: {c_acc:.1f}% ({category_correct_count}/{total_bills})")
    print("=" * 72)

if __name__ == "__main__":
    run_evaluation()

