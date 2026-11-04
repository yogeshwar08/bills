import io
import logging
from typing import Tuple, Optional
from PIL import Image, ImageOps, ImageEnhance

logger = logging.getLogger("bill_snap.preprocessor")

# Max allowable raw file upload size (10 MB)
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
# Max dimension for LLM vision (downscale if larger to prevent timeouts and reduce latency while keeping text razor-sharp)
MAX_IMAGE_DIMENSION = 2048
MIN_IMAGE_DIMENSION = 50

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
}

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

class ImagePreprocessingError(Exception):
    """Raised when image validation or preprocessing fails."""
    pass

class ImagePreprocessor:
    @staticmethod
    def validate_file_metadata(content_type: str, file_size: int, filename: Optional[str] = None):
        """Validates MIME type, file size and optional filename extension."""
        if file_size > MAX_FILE_SIZE_BYTES:
            raise ImagePreprocessingError(
                f"File size ({file_size / (1024*1024):.2f} MB) exceeds maximum allowed size of 10 MB."
            )
        
        if content_type.lower() not in ALLOWED_MIME_TYPES:
            raise ImagePreprocessingError(
                f"Unsupported content type '{content_type}'. Allowed types are: JPG, JPEG, PNG, WEBP."
            )

        if filename:
            dot_idx = filename.rfind(".")
            if dot_idx != -1:
                ext = filename[dot_idx:].lower()
                if ext not in ALLOWED_EXTENSIONS:
                    raise ImagePreprocessingError(
                        f"Unsupported file extension '{ext}'. Allowed extensions are: .jpg, .jpeg, .png, .webp."
                    )

    @staticmethod
    def preprocess_image(image_bytes: bytes) -> Tuple[bytes, str, Tuple[int, int]]:
        """
        Processes in-memory image bytes:
        1. Validates integrity.
        2. Fixes mobile EXIF orientation (rotates properly).
        3. Converts palette / RGBA to clean RGB.
        4. Applies mild contrast normalization for low-light receipts.
        5. Resizes if dimension exceeds MAX_IMAGE_DIMENSION.
        6. Returns (processed_bytes, mime_type, (width, height)).
        """
        if not image_bytes:
            raise ImagePreprocessingError("Uploaded file is empty.")

        try:
            # First pass: verify integrity
            with Image.open(io.BytesIO(image_bytes)) as test_img:
                test_img.verify()
        except Exception as e:
            logger.warning("Corrupted or invalid image bytes: %s", str(e))
            raise ImagePreprocessingError("Uploaded image file is corrupted or could not be decoded.")

        try:
            # Second pass: reopen for processing
            with Image.open(io.BytesIO(image_bytes)) as img:
                # 1. Correct EXIF orientation from mobile cameras
                try:
                    img = ImageOps.exif_transpose(img)
                except Exception as exif_err:
                    logger.debug("EXIF transposition skipped: %s", exif_err)

                # Check minimum dimension
                width, height = img.size
                if width < MIN_IMAGE_DIMENSION or height < MIN_IMAGE_DIMENSION:
                    raise ImagePreprocessingError(
                        f"Image is too small ({width}x{height}). Minimum required resolution is 50x50 pixels."
                    )

                # 2. Convert to RGB (handles RGBA, P, grayscale, CMYK, etc.)
                if img.mode != "RGB":
                    img = img.convert("RGB")

                # 3. Handle low-light / underexposed photographs with gentle auto-contrast
                # Calculate mean luminance
                try:
                    gray = img.convert("L")
                    stat = gray.getextrema()
                    # If contrast dynamic range is very narrow (< 100), apply subtle contrast boost
                    if (stat[1] - stat[0]) < 120:
                        enhancer = ImageEnhance.Contrast(img)
                        img = enhancer.enhance(1.25)
                except Exception as enhance_err:
                    logger.debug("Contrast enhancement skipped: %s", enhance_err)

                # 4. Scale down if overly large (e.g. 48MP phone captures)
                max_side = max(width, height)
                if max_side > MAX_IMAGE_DIMENSION:
                    scaling_factor = MAX_IMAGE_DIMENSION / float(max_side)
                    new_width = int(width * scaling_factor)
                    new_height = int(height * scaling_factor)
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    width, height = img.size

                # 5. Export back to in-memory JPEG bytes
                output_buffer = io.BytesIO()
                img.save(output_buffer, format="JPEG", quality=90, optimize=True)
                processed_bytes = output_buffer.getvalue()

                return processed_bytes, "image/jpeg", (width, height)

        except ImagePreprocessingError:
            raise
        except Exception as e:
            logger.error("Error during image preprocessing: %s", str(e))
            raise ImagePreprocessingError(f"Failed to process image: {str(e)}")

