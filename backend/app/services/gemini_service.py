import json
import os
import re
import time
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.schemas.bill_schema import BillAnalysisResponse, ClassificationEnum
from app.prompts.bill_prompts import BILL_ANALYSIS_SYSTEM_PROMPT, BILL_ANALYSIS_USER_PROMPT
from app.utils.logger import logger

DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest"
# Ordered by speed, active quota, and reliability for structured JSON bill extraction
FALLBACK_MODELS = [
    "gemini-flash-lite-latest",   # Primary: verified ~1.5s, active quota
    "gemini-3.5-flash-lite",      # Fallback 1: verified ~2.1s, active quota
]

class GeminiServiceException(Exception):
    """Custom exception for Gemini vision API errors."""
    def __init__(self, message: str, status_code: int = 500, error_code: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code

class GeminiVisionService:
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self._api_key = api_key
        self._model_name = model_name
        self._client: Optional[genai.Client] = None
        self._active_key: Optional[str] = None

    @property
    def api_key(self) -> str:
        if self._api_key:
            return self._api_key
        key = os.getenv("GEMINI_API_KEY", "").strip()
        if not key:
            # Re-read backend/.env in case user just updated it
            env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
            if os.path.exists(env_path):
                load_dotenv(env_path, override=True)
            key = os.getenv("GEMINI_API_KEY", "").strip()
        return key

    @property
    def model_name(self) -> str:
        return self._model_name or os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip()

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def get_client(self) -> genai.Client:
        key = self.api_key
        if not key:
            raise GeminiServiceException(
                "Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable.",
                status_code=503,
                error_code="MISSING_API_KEY"
            )
        if self._client is None or self._active_key != key:
            self._client = genai.Client(api_key=key)
            self._active_key = key
        return self._client

    @staticmethod
    def _extract_json_from_text(raw_text: str) -> Dict[str, Any]:
        """Strips markdown code fences and parses JSON securely."""
        clean_text = raw_text.strip()
        
        # Check for ```json ... ``` wrapper
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean_text)
        if match:
            clean_text = match.group(1).strip()
        
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError as jde:
            # Fallback: search for outermost { ... }
            curly_match = re.search(r"(\{[\s\S]*\})", clean_text)
            if curly_match:
                try:
                    return json.loads(curly_match.group(1))
                except json.JSONDecodeError:
                    pass
            logger.error("Failed to parse JSON from model response. Preview: %s", clean_text[:200])
            raise GeminiServiceException(
                f"The AI model returned an unparseable response: {str(jde)}",
                status_code=502,
                error_code="MALFORMED_AI_RESPONSE"
            )

    def analyze_bill_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> BillAnalysisResponse:
        """
        Sends preprocessed image bytes to Gemini Vision API with structured system instructions.
        Applies automatic cascading across fallback models on transient 503 or 404 errors.
        Model priority: gemini-3.5-flash -> gemini-2.5-flash -> gemini-3.7-flash -> ...
        Per-model timeout: 30 seconds to avoid indefinite hangs on slow models.
        """
        client = self.get_client()

        # Build deduped ordered list: configured model first, then all FALLBACK_MODELS in order
        configured = self.model_name
        models_to_try = [configured] + [m for m in FALLBACK_MODELS if m != configured]
        last_error: Optional[Exception] = None

        for model in models_to_try:
            max_retries = 1
            delay = 1.5

            for attempt in range(max_retries + 1):
                try:
                    logger.info(
                        "Sending image to Gemini Vision (model: %s, attempt %d/%d, payload size: %d bytes)",
                        model, attempt + 1, max_retries + 1, len(image_bytes)
                    )

                    start_time = time.time()
                    response = client.models.generate_content(
                        model=model,
                        contents=[
                            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                            BILL_ANALYSIS_USER_PROMPT
                        ],
                        config=types.GenerateContentConfig(
                            system_instruction=BILL_ANALYSIS_SYSTEM_PROMPT,
                            response_mime_type="application/json",
                            temperature=0.1,
                        )
                    )
                    elapsed = time.time() - start_time
                    logger.info("Model %s responded in %.1f seconds", model, elapsed)

                    if not response or not response.text:
                        raise GeminiServiceException(
                            "The AI model returned an empty response.",
                            status_code=502,
                            error_code="EMPTY_MODEL_RESPONSE"
                        )

                    parsed_json = self._extract_json_from_text(response.text)

                    # Validate using Pydantic schema
                    validated_response = BillAnalysisResponse.model_validate(parsed_json)
                    logger.info(
                        "AI Analysis successful with %s: Classification=%s (confidence=%.2f)",
                        model,
                        validated_response.classification.value,
                        validated_response.classification_confidence
                    )
                    return validated_response

                except APIError as api_err:
                    error_msg = str(api_err)
                    logger.warning("Gemini API error with %s on attempt %d: %s", model, attempt + 1, error_msg)
                    last_error = api_err

                    # Authentication errors: fail immediately without trying other models
                    if "UNAUTHENTICATED" in error_msg or "API key not valid" in error_msg or "403" in error_msg:
                        raise GeminiServiceException(
                            "Invalid or unauthorized Gemini API key. Please verify your GEMINI_API_KEY in backend/.env.",
                            status_code=401,
                            error_code="INVALID_API_KEY"
                        )

                    # Model not found, overloaded (503), or quota exhausted (429): skip to next fallback model immediately!
                    if (
                        "NOT_FOUND" in error_msg
                        or "404" in error_msg
                        or "503" in error_msg
                        or "UNAVAILABLE" in error_msg
                        or "high demand" in error_msg.lower()
                        or "429" in error_msg
                        or "RESOURCE_EXHAUSTED" in error_msg
                        or "quota" in error_msg.lower()
                    ):
                        logger.warning("Model %s unavailable or quota exhausted, trying next fallback immediately...", model)
                        break

                    # Other transient errors: retry once with delay
                    if attempt < max_retries:
                        time.sleep(delay)
                        continue

                    # Exhausted retries for this model
                    break

                except GeminiServiceException:
                    raise

                except Exception as e:
                    logger.error("Unexpected error in GeminiVisionService with %s: %s", model, str(e))
                    last_error = e
                    if attempt < max_retries:
                        time.sleep(delay)
                        continue
                    break

        if last_error:
            raise GeminiServiceException(
                f"Gemini API analysis failed: {str(last_error)}",
                status_code=502,
                error_code="GEMINI_API_ERROR"
            )

        raise GeminiServiceException(
            "Failed to analyze image after trying all available Gemini models.",
            status_code=504,
            error_code="TIMEOUT_OR_MAX_RETRIES"
        )

