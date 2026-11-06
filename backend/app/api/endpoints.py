import os
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.schemas.bill_schema import BillAnalysisResponse, HealthResponse
from app.services.image_preprocessor import ImagePreprocessor, ImagePreprocessingError
from app.services.gemini_service import GeminiVisionService, GeminiServiceException
from app.services.database_service import db_service
from app.utils.logger import logger

router = APIRouter()

gemini_service = GeminiVisionService()

@router.get("/health", response_model=HealthResponse)
def get_health():
    """Health check endpoint indicating whether Gemini AI is configured without leaking credentials."""
    return HealthResponse(
        status="healthy",
        gemini_configured=gemini_service.is_configured,
        model_name=gemini_service.model_name,
        version="1.0.0"
    )

@router.post("/analyze", response_model=BillAnalysisResponse)
async def analyze_bill(file: UploadFile = File(...)):
    """
    Main bill analysis endpoint:
    1. Validates upload file format, size, and header.
    2. Runs PIL preprocessing (EXIF correction, contrast boost, resolution guard).
    3. Analyzes image using Gemini Vision API with structured JSON output.
    4. Guarantees 0 disk footprint (100% in-memory).
    """
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "EMPTY_FILE", "message": "No file uploaded."}
        )

    # Read uploaded bytes
    try:
        contents = await file.read()
    except Exception as read_err:
        logger.error("Failed to read uploaded file: %s", str(read_err))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "FILE_READ_ERROR", "message": "Could not read uploaded file content."}
        )

    # 1. Validate file metadata
    try:
        ImagePreprocessor.validate_file_metadata(
            content_type=file.content_type or "application/octet-stream",
            file_size=len(contents),
            filename=file.filename
        )
    except ImagePreprocessingError as prep_err:
        logger.warning("File validation error: %s", str(prep_err))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_IMAGE_METADATA", "message": str(prep_err)}
        )

    # 2. Preprocess image in memory
    try:
        processed_bytes, mime_type, dimensions = ImagePreprocessor.preprocess_image(contents)
        logger.info(
            "Preprocessed image successfully: dimensions=%dx%d, processed_size=%d bytes",
            dimensions[0], dimensions[1], len(processed_bytes)
        )
    except ImagePreprocessingError as prep_err:
        logger.warning("Image preprocessing failed: %s", str(prep_err))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error_code": "IMAGE_CORRUPTED_OR_UNPROCESSABLE", "message": str(prep_err)}
        )

    # 3. Call Gemini Vision
    try:
        result = gemini_service.analyze_bill_image(processed_bytes, mime_type)

        # Check for duplicate scan in database (same merchant and same amount)
        if (
            result.fields
            and result.fields.merchant_name
            and result.fields.merchant_name.value
            and result.fields.total_amount
            and result.fields.total_amount.value is not None
        ):
            existing_dup = db_service.check_duplicate(
                result.fields.merchant_name.value,
                result.fields.total_amount.value
            )
            if existing_dup:
                result.is_duplicate = True
                result.duplicate_warning = (
                    f"A bill from '{existing_dup['merchant_name']}' with total amount "
                    f"₹{existing_dup['total_amount']:.2f} was already scanned on {existing_dup['created_at']} "
                    f"(Scan ID: {existing_dup['scan_id']})."
                )
                logger.warning(
                    "Duplicate bill detected: merchant=%s, amount=%s",
                    result.fields.merchant_name.value,
                    result.fields.total_amount.value
                )

        # 4. Automatically persist structured output in SQLite 3 database
        try:
            scan_id = db_service.save_scan(result, filename=file.filename)
            result.scan_id = scan_id
        except Exception as db_err:
            logger.error("Failed to persist scan output to SQLite: %s", str(db_err))

        return result
    except GeminiServiceException as gse:
        logger.error("Gemini service exception [%s]: %s", gse.error_code, gse.message)
        raise HTTPException(
            status_code=gse.status_code,
            detail={"error_code": gse.error_code or "AI_ANALYSIS_FAILED", "message": gse.message}
        )
    except Exception as unk_err:
        logger.error("Unhandled error during bill analysis: %s", str(unk_err))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error_code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred during bill analysis."}
        )


@router.get("/scans", response_model=List[dict])
def list_scans(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """Retrieves list of structured bill scan outputs stored in SQLite."""
    return db_service.list_scans(limit=limit, offset=offset)


@router.get("/scans/{scan_id}")
def get_scan(scan_id: str):
    """Retrieves a single structured bill scan from SQLite by scan_id."""
    record = db_service.get_scan(scan_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "SCAN_NOT_FOUND", "message": f"Scan '{scan_id}' not found in database."}
        )
    return record


@router.delete("/scans/{scan_id}")
def delete_scan(scan_id: str):
    """Deletes a scan record from SQLite by scan_id."""
    deleted = db_service.delete_scan(scan_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "SCAN_NOT_FOUND", "message": f"Scan '{scan_id}' not found in database."}
        )
    return {"status": "success", "message": f"Scan '{scan_id}' deleted successfully."}


@router.get("/scans-stats")
def get_scans_stats():
    """Returns summary metrics across all scans saved in SQLite."""
    return db_service.get_stats()


@router.post("/scans/seed")
def seed_scans(force: bool = Query(default=False)):
    """
    Populates SQLite database with the 20 verified benchmark evaluation records.
    Safe: does not overwrite existing records, uses unique scan IDs.
    """
    try:
        return db_service.seed_benchmark_data(force=force)
    except Exception as e:
        logger.error("Failed to seed benchmark records: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error_code": "SEED_FAILED", "message": f"Seeding failed: {str(e)}"}
        )


