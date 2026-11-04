# Bill Snap — Technical Interview Preparation & Code Defense Guide
*Specifically tailored for a 2025 B.Tech CSE Graduate / Fresher*

---

## Part 1: Core System Concepts (Defending Your Architectural Decisions)

### 1. Overall Architecture
- **Concept**: A 3-tier decoupled architecture:
  1. **Presentation & Local Persistence**: A mobile-first Progressive Web Application (PWA) built with React 18, Vite, and Tailwind CSS. It communicates with local browser storage via **IndexedDB (Dexie.js)** for 100% private, offline-accessible financial record keeping.
  2. **Application & Preprocessing Backend**: An asynchronous REST API built with **FastAPI (Python 3.11)**. It performs in-memory image validation and preprocessing using Pillow (PIL), guaranteeing that no user documents ever touch server disk storage.
  3. **Multimodal AI Engine**: **Google Gemini Vision API** (`gemini-2.5-flash`), which receives the preprocessed image byte stream alongside strict system prompts and outputs schema-validated JSON.
- **How to explain in an interview**:
  > *"I structured Bill Snap as a privacy-preserving, local-first utility. The React PWA provides an app-like mobile experience directly in the browser. When an image is captured, it is processed entirely in-memory by our FastAPI backend and evaluated by Gemini Vision. The results are returned to the client, where they are audited, edited, and stored directly in the browser's IndexedDB. At no point are financial receipts permanently stored on our servers."*

---

### 2. Why React PWA Instead of React Native?
- **Zero Install Friction**: Users do not need to download a 50MB app from the App Store or Google Play Store to scan a bill; they can open a web URL and tap "Add to Home Screen".
- **Single Cross-Platform Codebase**: One web codebase runs across Android Chrome, iOS Safari, desktop macOS, Windows, and Linux without native bridging or OS-specific build toolchains (Xcode/Gradle).
- **Service Worker Caching**: With `vite-plugin-pwa`, the entire application shell, styles, and scripts are cached on the device, allowing instant launch and offline access to historical bills.
- **Hardware Access**: Modern web APIs (`<input capture="environment">`) provide native camera launch without complex native camera permissions or background thread threading issues.

---

### 3. Why FastAPI?
- **Asynchronous Throughput**: FastAPI is built on Starlette and Uvicorn (ASGI), providing non-blocking asynchronous request handling. While one thread waits for the Gemini API network response, the event loop handles other concurrent user requests.
- **Automatic Schema Validation**: Pydantic v2 schemas (`BillAnalysisResponse`, `ExtractedField`) validate every inbound request and outbound model response at native C-speed (`pydantic-core`), automatically rejecting malformed AI outputs before they reach the frontend.
- **Developer Productivity & Documentation**: Automatic OpenAPI/Swagger UI generation (`/docs`) makes endpoint testing and contract sharing effortless.

---

### 4. Why Gemini Vision Instead of Traditional OCR (Tesseract + Regex)?
- **Context-Aware Semantic Understanding**: Traditional OCR (like Tesseract) only converts pixels to raw unstructured strings. Extracting the "Total Amount" then requires dozens of brittle regular expressions (e.g., regex looking for `TOTAL`, `NET`, `DUE`, `BALANCE`). If a bill prints "Subtotal: $100, Tax: $10, Total Paid: $110, Change Due: $90", regexes often mistakenly capture $90 or $100.
- **Multimodal Spatial Reasoning**: Gemini Vision analyzes both text and visual layout (bounding boxes, font weights, lines, positions). It recognizes that a large bold number at the bottom right next to "Total" is the grand total, while a number near "Invoice #" is a reference code.
- **Classification & Extraction in One Shot**: A single LLM vision call performs bill verification, document type detection, entity extraction, category prediction, and confidence self-assessment simultaneously.

---

### 5. How Image Classification Works (BILL vs NON_BILL vs UNCERTAIN)
- **Financial Transaction Criteria**: The system prompt instructs Gemini to search for commercial indicators: merchant identity, itemized products/services, transaction date, and amount paid/payable.
- **Handling Edge Cases**:
  - *ID Cards & Selfies*: Non-financial documents lack a commercial purchase agreement; classified as `NON_BILL` with specific types (`ID card`, `Selfie or portrait`).
  - *Digital Invoices & Screenshots*: The prompt explicitly guides the model **not** to reject screenshots blindly. A screenshot of an Uber trip receipt, Amazon order summary, or Swiggy bill is classified as a genuine `BILL`.
  - *Damaged / Corrupted*: Heavily obscured images return `UNCERTAIN`, triggering a polite retry prompt in the UI.

---

### 6. How Information Extraction Works
- **Merchant Extraction**: Identifies the primary trading business header, ignoring manufacturer branding on individual item lines.
- **Date Normalization**: The prompt requests ISO `YYYY-MM-DD`. If ambiguous (e.g. `10/11/2024` on an Indian receipt vs US receipt), the model reasons from geographical cues (currency symbol ₹ vs $) to resolve day/month order.
- **Amount Disambiguation**: The prompt strictly instructs the model to prefer final payable/paid grand total over subtotals, tender amounts, discounts, or change given.

---

### 7. How Confidence Scores Work
- **Heuristic Self-Assessment**: The model outputs a float between 0.0 and 1.0 based on visual clarity, font contrast, and contextual certainty.
- **Critical Interview Distinction**:
  > *"In an interview, I make sure to emphasize that model-generated confidence scores are heuristic estimates produced by the LLM, not mathematically calibrated Bayesian probabilities. A score of 0.95 means the model is highly certain based on clear legible text, but it is not a statistical guarantee. That is why our UX highlights medium/low confidence fields and requires user confirmation before saving."*

---

### 8. How Uncertain Fields Are Handled
- **Visual Color Hierarchy**:
  - **High ($\ge 85\%$)**: Neutral green badge (`bg-emerald-50 text-emerald-700`).
  - **Medium ($60\% - 84\%$)**: Amber warning badge (`bg-amber-50 text-amber-700`).
  - **Low ($< 60\%$)**: Rose attention badge (`bg-rose-50 text-rose-700`).
- **Explanatory Callouts**: When a field has low confidence, the backend returns a `reason` (e.g., *"Merchant logo is partially cropped"*, *"Multiple totals detected; selected largest value"*), displayed inline in the UI so the user knows exactly why verification is needed.

---

### 9. Why IndexedDB Instead of PostgreSQL?
- **Privacy by Design**: Financial receipts contain sensitive personal data (spending habits, card last-4 digits, location). Storing them in a central cloud PostgreSQL database introduces GDPR/privacy risks, server hosting costs, and authentication requirements.
- **Offline First**: IndexedDB lives inside the user's browser sandbox. The user can view past bills, search transactions, and analyze monthly spending even in airplane mode.
- **High Storage Capacity**: Unlike `localStorage` (capped at ~5MB of string data), IndexedDB supports hundreds of megabytes of structured JSON and binary thumbnail images.

---

### 10. API Request and Response Flow
1. User captures image $\rightarrow$ React creates `File` object $\rightarrow$ Validates size ($<10\text{MB}$) and format.
2. React sends `multipart/form-data` to `POST /api/analyze`.
3. FastAPI receives file as `UploadFile` into memory buffer.
4. `ImagePreprocessor` validates file header, transposes mobile EXIF rotation, enhances contrast if underexposed, and resizes if $>2048\text{px}$.
5. `GeminiVisionService` sends in-memory JPEG stream to Gemini Vision with `GenerateContentConfig(response_mime_type="application/json")`.
6. Gemini responds with structured JSON.
7. Backend validates JSON against Pydantic `BillAnalysisResponse`.
8. Frontend receives validated response, computes local thumbnail, and displays the **Extraction & Correction Screen**.
9. User clicks "Save" $\rightarrow$ record is committed directly to browser IndexedDB (`db.bills.add(...)`).

---

### 11. Security and Privacy
- **Zero Disk Footprint**: Images are never written to the server's filesystem; they exist only as transient bytes in RAM during analysis.
- **No API Key Exposure**: The Gemini API key is stored exclusively in server environment variables (`.env`).
- **No Stack Trace Leaks**: Centralized exception handlers catch errors and return sanitized JSON error codes (`INVALID_IMAGE_METADATA`, `AI_ANALYSIS_FAILED`).
- **Sanitized Server Logs**: Server logs contain timestamp, status codes, and classification summaries without printing item names, amounts, or merchant details.

---

### 12. ML Evaluation Methodology
- **Benchmark Dataset**: 20 standardized test cases (15 genuine bills across conditions like crumpled, low-light, angled, blurry, handwritten, faded; 5 non-bills like ID cards, selfies, screenshots).
- **Evaluation Script (`run_evaluation.py`)**: Automatically posts images to the API and compares predictions to human ground truth.
- **Normalized Matching**:
  - Amount: $\pm 0.50$ tolerance.
  - Date: Standardized to ISO `YYYY-MM-DD`.
  - Merchant: Normalized case-folding, whitespace trimming, and punctuation removal.
- **Metrics Computed**: Classification accuracy, precision, recall, false positive rate, false negative rate, and field-level accuracies.

---

### 13. Limitations and Failure Modes
- **Extreme Degradation**: Thermal receipts with $>70\%$ faded ink or severe motion blur cannot be deciphered.
- **Offline AI**: Vision analysis requires an internet connection; local viewing and dashboard analytics work offline.
- **Handwritten Variance**: Highly idiosyncratic doctor prescriptions or non-standard cursive handwriting can produce low confidence scores.

---

## Part 2: Top Technical Questions an Interviewer May Ask You

### Q1: *"In your FastAPI backend, why did you use `UploadFile` instead of reading `bytes` directly?"*
**Answer**:
> *"FastAPI's `UploadFile` is backed by a SpooledTemporaryFile. For small files (<1MB), it keeps everything in RAM without touching the hard drive. If a user uploads a larger 8MB image, it manages memory safely without causing RAM spikes or server Out-Of-Memory (OOM) crashes under concurrent load."*

---

### Q2: *"How do you handle mobile photos taken in portrait mode that appear rotated sideways on the server?"*
**Answer**:
> *"Mobile phone cameras store the physical orientation in EXIF metadata rather than rotating the raw pixel array. In `ImagePreprocessor.preprocess_image`, we call `ImageOps.exif_transpose(img)` from Pillow. This reads the EXIF orientation tag and transforms the pixel buffer accordingly so the model always receives an upright image with correctly oriented text."*

---

### Q3: *"What happens if Gemini Vision hallucinates a markdown block or extra conversational text around the JSON response?"*
**Answer**:
> *"First, we configure Gemini with `response_mime_type='application/json'`, which forces JSON output at the model decoding level. Second, in `GeminiVisionService._extract_json_from_text`, we use regular expressions to strip any ````json ... ```` fences. Third, we parse it through Pydantic's `BillAnalysisResponse.model_validate()`. If any mandatory field is missing or invalid, Pydantic catches it immediately, preventing corrupted data from reaching the frontend."*

---

### Q4: *"How did you prevent large images from blowing up client IndexedDB storage?"*
**Answer**:
> *"We implemented a client-side thumbnail utility (`createThumbnail` in `imageCompressor.ts`) using an off-screen HTML5 `<canvas>`. Before storing a bill in IndexedDB, the image is scaled down to a maximum dimension of 240 pixels and compressed to JPEG with 0.7 quality. This reduces an 8MB camera capture down to a ~25KB thumbnail, allowing users to store thousands of bills without exceeding browser quota limits."*

---

### Q5: *"Why did you use Dexie.js instead of the raw browser IndexedDB API?"*
**Answer**:
> *"The raw browser IndexedDB API relies on an old event-driven callback model (`IDBOpenDBRequest`, `onsuccess`, `onerror`) that leads to callback hell and complex transaction management. Dexie.js wraps IndexedDB in modern TypeScript promises and integrates cleanly with React hooks via `useLiveQuery()`. Whenever a bill is added or deleted, `useLiveQuery` automatically triggers a reactive re-render of our Home and History screens without manual state synchronization."*

---

### Q6: *"How do you test your backend API without spending money on Gemini API credits during automated CI tests?"*
**Answer**:
> *"In `backend/tests/test_api.py`, we use Python's `unittest.mock.patch` to mock `GeminiVisionService.analyze_bill_image`. We test valid bill responses, non-bill rejections, missing fields, corrupted byte uploads, and malformed JSON scenarios entirely offline. All 15 unit tests run in less than 3 seconds without making a single external network call or using API credits."*

