import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse

from app.schemas.bill_schema import BillAnalysisResponse, HealthResponse
from app.services.image_preprocessor import ImagePreprocessor, ImagePreprocessingError
from app.services.gemini_service import GeminiVisionService, GeminiServiceException
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

