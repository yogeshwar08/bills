import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.schemas.bill_schema import (
    BillAnalysisResponse,
    ClassificationEnum,
    BillFields,
    ExtractedField,
    BillCategoryEnum
)
from app.services.image_preprocessor import ImagePreprocessor, ImagePreprocessingError
from app.services.gemini_service import GeminiVisionService, GeminiServiceException

client = TestClient(app)

def create_dummy_image_bytes(width: int = 400, height: int = 400, color: str = "white") -> bytes:
    """Creates a valid JPEG image in memory for testing."""
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format="JPEG")
    return buf.getvalue()

# ----------------- HEALTH & ROOT TESTS -----------------

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "Bill Snap API"
    assert data["status"] == "running"

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "gemini_configured" in data
    assert "model_name" in data

# ----------------- IMAGE PREPROCESSOR TESTS -----------------

def test_preprocessor_valid_image():
    dummy = create_dummy_image_bytes(200, 200)
    processed_bytes, mime_type, dims = ImagePreprocessor.preprocess_image(dummy)
    assert mime_type == "image/jpeg"
    assert dims == (200, 200)
    assert len(processed_bytes) > 0

def test_preprocessor_downscales_large_image():
    dummy = create_dummy_image_bytes(3000, 2000)
    processed_bytes, mime_type, dims = ImagePreprocessor.preprocess_image(dummy)
    assert dims[0] == 2048
    assert dims[1] < 2000

def test_preprocessor_rejects_tiny_image():
    dummy = create_dummy_image_bytes(20, 20)
    with pytest.raises(ImagePreprocessingError) as exc_info:
        ImagePreprocessor.preprocess_image(dummy)
    assert "too small" in str(exc_info.value).lower()

def test_preprocessor_rejects_corrupted_bytes():
    corrupted = b"not_an_image_file_content"
    with pytest.raises(ImagePreprocessingError):
        ImagePreprocessor.preprocess_image(corrupted)

def test_preprocessor_rejects_invalid_mime_type():
    with pytest.raises(ImagePreprocessingError) as exc_info:
        ImagePreprocessor.validate_file_metadata("application/pdf", 1000, "doc.pdf")
    assert "unsupported content type" in str(exc_info.value).lower()

def test_preprocessor_rejects_oversized_file():
    with pytest.raises(ImagePreprocessingError) as exc_info:
        ImagePreprocessor.validate_file_metadata("image/jpeg", 15 * 1024 * 1024, "huge.jpg")
    assert "exceeds maximum allowed size" in str(exc_info.value).lower()

# ----------------- ANALYZE ENDPOINT TESTS (MOCKED) -----------------

def test_analyze_invalid_mime_type_upload():
    response = client.post(
        "/api/analyze",
        files={"file": ("test.pdf", b"%PDF-1.4 dummy", "application/pdf")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["error_code"] == "INVALID_IMAGE_METADATA"

def test_analyze_corrupted_image_upload():
    response = client.post(
        "/api/analyze",
        files={"file": ("corrupt.jpg", b"corrupted bytes here", "image/jpeg")}
    )
    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["error_code"] == "IMAGE_CORRUPTED_OR_UNPROCESSABLE"

@patch.object(GeminiVisionService, "analyze_bill_image")
def test_analyze_valid_bill(mock_analyze):
    mock_analyze.return_value = BillAnalysisResponse(
        classification=ClassificationEnum.BILL,
        classification_confidence=0.96,
        reason="Detected standard supermarket receipt with merchant and transaction total.",
        fields=BillFields(
            merchant_name=ExtractedField(value="Fresh Mart", confidence=0.98, reason=None),
            date=ExtractedField(value="2024-11-04", confidence=0.95, reason=None),
            total_amount=ExtractedField(value=342.50, confidence=0.97, reason=None),
            currency="INR",
            category=ExtractedField(value=BillCategoryEnum.GROCERIES, confidence=0.92, reason="Groceries merchant")
        )
    )

    image_bytes = create_dummy_image_bytes()
    response = client.post(
        "/api/analyze",
        files={"file": ("receipt.jpg", image_bytes, "image/jpeg")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["classification"] == "BILL"
    assert data["classification_confidence"] == 0.96
    assert data["fields"]["merchant_name"]["value"] == "Fresh Mart"
    assert data["fields"]["total_amount"]["value"] == 342.50
    assert data["fields"]["category"]["value"] == "Groceries"
    assert data["fields"]["currency"] == "INR"

@patch.object(GeminiVisionService, "analyze_bill_image")
def test_analyze_non_bill_selfie(mock_analyze):
    mock_analyze.return_value = BillAnalysisResponse(
        classification=ClassificationEnum.NON_BILL,
        classification_confidence=0.99,
        non_bill_type="Selfie or portrait",
        reason="The uploaded image appears to be a portrait selfie, not a receipt or bill.",
        fields=None
    )

    image_bytes = create_dummy_image_bytes()
    response = client.post(
        "/api/analyze",
        files={"file": ("selfie.jpg", image_bytes, "image/jpeg")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["classification"] == "NON_BILL"
    assert data["non_bill_type"] == "Selfie or portrait"
    assert data["fields"] is None

@patch.object(GeminiVisionService, "analyze_bill_image")
def test_analyze_missing_fields_uncertain(mock_analyze):
    mock_analyze.return_value = BillAnalysisResponse(
        classification=ClassificationEnum.BILL,
        classification_confidence=0.82,
        reason="Receipt detected but top portion is torn.",
        fields=BillFields(
            merchant_name=ExtractedField(value=None, confidence=0.20, reason="Merchant name is torn off"),
            date=ExtractedField(value="2024-11-02", confidence=0.88, reason=None),
            total_amount=ExtractedField(value=120.0, confidence=0.91, reason=None),
            currency="INR",
            category=ExtractedField(value=BillCategoryEnum.OTHER, confidence=0.50, reason="Cannot infer merchant category")
        )
    )

    image_bytes = create_dummy_image_bytes()
    response = client.post(
        "/api/analyze",
        files={"file": ("torn_bill.jpg", image_bytes, "image/jpeg")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["fields"]["merchant_name"]["value"] is None
    assert data["fields"]["merchant_name"]["confidence"] == 0.20
    assert "torn" in data["fields"]["merchant_name"]["reason"]

@patch.object(GeminiVisionService, "analyze_bill_image")
def test_analyze_gemini_error_propagation(mock_analyze):
    mock_analyze.side_effect = GeminiServiceException(
        "The AI model returned an unparseable response: JSONDecodeError",
        status_code=502,
        error_code="MALFORMED_AI_RESPONSE"
    )

    image_bytes = create_dummy_image_bytes()
    response = client.post(
        "/api/analyze",
        files={"file": ("bill.jpg", image_bytes, "image/jpeg")}
    )

    assert response.status_code == 502
    data = response.json()
    assert data["detail"]["error_code"] == "MALFORMED_AI_RESPONSE"

def test_gemini_service_json_extractor():
    text_with_fences = '```json\n{"classification": "BILL", "classification_confidence": 0.9, "reason": "ok", "fields": null}\n```'
    parsed = GeminiVisionService._extract_json_from_text(text_with_fences)
    assert parsed["classification"] == "BILL"

    raw_text = 'Some chatter {"classification": "NON_BILL", "classification_confidence": 0.95, "reason": "id", "fields": null}'
    parsed2 = GeminiVisionService._extract_json_from_text(raw_text)
    assert parsed2["classification"] == "NON_BILL"

    with pytest.raises(GeminiServiceException):
        GeminiVisionService._extract_json_from_text("Invalid non json string")

# ----------------- SQLITE 3 DATABASE TESTS -----------------

def test_sqlite_persistence_and_endpoints():
    mock_response = BillAnalysisResponse(
        classification=ClassificationEnum.BILL,
        classification_confidence=0.97,
        reason="Test invoice receipt",
        fields=BillFields(
            merchant_name=ExtractedField(value="SQLite Mart", confidence=0.96, reason=None),
            date=ExtractedField(value="2026-11-05", confidence=0.94, reason=None),
            total_amount=ExtractedField(value=189.50, confidence=0.98, reason=None),
            currency="INR",
            category=ExtractedField(value=BillCategoryEnum.GROCERIES, confidence=0.92, reason=None)
        )
    )

    with patch.object(GeminiVisionService, "analyze_bill_image", return_value=mock_response):
        image_bytes = create_dummy_image_bytes()
        res = client.post(
            "/api/analyze",
            files={"file": ("test_sqlite_bill.jpg", image_bytes, "image/jpeg")}
        )
        assert res.status_code == 200
        data = res.json()
        assert "scan_id" in data
        scan_id = data["scan_id"]
        assert scan_id.startswith("scan_")

        # 1. Test GET /api/scans
        list_res = client.get("/api/scans")
        assert list_res.status_code == 200
        scans = list_res.json()
        assert any(s["scan_id"] == scan_id for s in scans)

        # 2. Test GET /api/scans/{scan_id}
        get_res = client.get(f"/api/scans/{scan_id}")
        assert get_res.status_code == 200
        record = get_res.json()
        assert record["merchant_name"] == "SQLite Mart"
        assert record["total_amount"] == 189.50
        assert record["currency"] == "INR"
        assert record["category"] == "Groceries"
        assert record["classification"] == "BILL"

        # 3. Test GET /api/scans-stats
        stats_res = client.get("/api/scans-stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_bills"] >= 1
        assert stats["total_spending"] >= 189.50

        # 4. Test DELETE /api/scans/{scan_id}
        del_res = client.delete(f"/api/scans/{scan_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "success"

        # Confirm deleted
        del_check = client.get(f"/api/scans/{scan_id}")
        assert del_check.status_code == 404


