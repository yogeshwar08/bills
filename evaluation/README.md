# Bill Snap — ML Evaluation Dataset & Pipeline

This directory contains the machine learning evaluation harness for **Bill Snap**, benchmarking the Gemini Vision multimodal classification and extraction pipeline across 20 distinct document conditions.

---

## 1. Dataset Structure

The benchmark consists of 20 high-fidelity test images across two partitions:

### A. Genuine Bills (15 Conditions)
Located in `evaluation/images/bills/`:
1. `bill_01.jpg` — **Clear printed receipt**: Standard high-contrast coffee shop receipt.
2. `bill_02.jpg` — **Grocery bill**: Supermarket itemized receipt with GST breakdown and subtotal.
3. `bill_03.jpg` — **Restaurant bill**: Fine-dining bill with table number, service charges, and taxes.
4. `bill_04.jpg` — **Electricity bill**: High-tension residential power invoice with kWh meter readings.
5. `bill_05.jpg` — **Water bill**: Municipal water supply demand note with account numbers.
6. `bill_06.jpg` — **Internet bill**: Telecom fiber broadband invoice with monthly billing cycle.
7. `bill_07.jpg` — **Pharmacy bill**: Retail medical cash memo listing medicines.
8. `bill_08.jpg` — **Shopping invoice**: Retail apparel store invoice with return policies.
9. `bill_09.jpg` — **Handwritten bill**: Traditional Kirana grocery cash memo on yellow receipt pad.
10. `bill_10.jpg` — **Crumpled bill**: Wrinkled paper receipt with shadows and fold creases.
11. `bill_11.jpg` — **Blurry bill**: Camera motion-blurred capture with degraded letter boundaries.
12. `bill_12.jpg` — **Angled photograph**: Skewed perspective shot taken at a 15–45 degree tilt.
13. `bill_13.jpg` — **Low-light photograph**: Dimly lit, underexposed restaurant receipt.
14. `bill_14.jpg` — **Long receipt**: 15+ item supermarket bill with multi-tier subtotals and discounts.
15. `bill_15.jpg` — **Faded or partially damaged receipt**: Degraded thermal print with faded totals.

### B. Non-Bill Documents (5 Conditions)
Located in `evaluation/images/non_bills/`:
16. `non_bill_16.jpg` — **Selfie / Portrait**: Personal portrait photograph.
17. `non_bill_17.jpg` — **ID card**: National identification card without financial transactions.
18. `non_bill_18.jpg` — **General screenshot**: Social chat application conversation screen.
19. `non_bill_19.jpg` — **Personal photograph**: Landscape nature scenery photograph.
20. `non_bill_20.jpg` — **General non-financial document**: University certificate of completion.

---

## 2. Normalization & Matching Rules

When evaluating model predictions against human ground truth (`ground_truth.csv`), strict literal string matching produces false negatives due to minor formatting discrepancies. The pipeline applies standard normalization:

1. **Merchant Normalization**:
   - Strips non-alphanumeric punctuation (e.g. `'`, `.`, `-`).
   - Normalizes whitespace and folds case to lowercase.
   - Evaluates positive match if normalized ground truth and prediction match, or if one is a strong substring of the other (e.g., `"Starbucks"` vs `"Starbucks Coffee"`).

2. **Date Normalization**:
   - Parses multiple input date formats (`YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, `DD-Mon-YYYY`).
   - Converts both ground-truth and extracted dates into standard ISO `YYYY-MM-DD`.

3. **Amount Normalization**:
   - Strips currency symbols (`₹`, `$`, `Rs`, `EUR`).
   - Converts values to floating point numbers.
   - Applies an absolute numerical tolerance of $\pm 0.50$ (accounts for cents/paise rounding or minor tax subtotal confusion).

4. **Category Normalization**:
   - Case-insensitive string comparison against standard categories: `Food`, `Groceries`, `Utilities`, `Shopping`, `Transportation`, `Healthcare`, `Entertainment`, `Education`, `Other`.

5. **Non-Bill Fields**:
   - For non-bill samples, merchant, date, amount, and category are marked `N/A` as they do not apply.

---

## 3. How to Run the Evaluation

### Prerequisites
1. Ensure your Gemini API Key is configured in `backend/.env`:
   ```bash
   GEMINI_API_KEY=your_actual_gemini_api_key
   ```
2. Start the FastAPI backend server:
   ```powershell
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

### Running the Evaluation Script
In a separate terminal, run:
```powershell
python evaluation/run_evaluation.py
```

The script will:
1. Ping `/api/health` to confirm server readiness.
2. Read the 20 benchmark test images.
3. Dispatch each image to `/api/analyze`.
4. Compare model predictions against `evaluation/ground_truth.csv`.
5. Generate `evaluation/results.csv`.
6. Print the terminal summary report with precision, recall, and field-level extraction accuracy.

---

## 4. How to Test with Your Own Real-World Photos

You can replace any of the 20 benchmark images with photographs you collect:
1. Save your photograph in `evaluation/images/bills/` or `evaluation/images/non_bills/` matching the ID (e.g. `bill_01.jpg`).
2. Open `evaluation/ground_truth.csv` in Excel or VS Code.
3. Enter the true values for `merchant_actual`, `date_actual` (`YYYY-MM-DD`), `amount_actual`, and `category_actual`.
4. Re-run `python evaluation/run_evaluation.py`.
5. Review the updated `results.csv`.

---

## 5. Failure Analysis & Uncertainty Calibration

### Why Difficult Conditions Fail
- **Faded Thermal Receipts (`bill_15`)**: Thermal ink oxidizes over time. When contrast falls below perceptual threshold, OCR fails to distinguish digit strokes (e.g., reading `815.00` as `315.00` or `null`).
- **Low-Light / Underexposed (`bill_13`)**: Severe underexposure reduces dynamic range. Preprocessing with PIL `ImageEnhance.Contrast` recovers visibility, but extreme shadows still lower model confidence.
- **Motion Blur (`bill_11`)**: High-frequency edge degradation causes character ambiguity (e.g., distinguishing `'3'` from `'8'`).
- **Handwritten Receipts (`bill_09`)**: Irregular cursive stroke geometry, lack of standardized layout, and ink bleed increase extraction variance.

### Uncertainty Calibration Insight
The Gemini Vision model provides heuristic confidence scores rather than true Bayesian posterior probabilities:
- High confidence ($>85\%$) strongly correlates with clean printed receipts.
- Low confidence ($<60\%$) accurately flags torn, faded, or blurry fields, giving the user actionable feedback in Bill Snap's **Extraction and Correction Screen**.

