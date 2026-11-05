from enum import Enum
from typing import Optional, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")

class ClassificationEnum(str, Enum):
    BILL = "BILL"
    NON_BILL = "NON_BILL"
    UNCERTAIN = "UNCERTAIN"

class BillCategoryEnum(str, Enum):
    FOOD = "Food"
    GROCERIES = "Groceries"
    UTILITIES = "Utilities"
    SHOPPING = "Shopping"
    TRANSPORTATION = "Transportation"
    HEALTHCARE = "Healthcare"
    ENTERTAINMENT = "Entertainment"
    EDUCATION = "Education"
    OTHER = "Other"

class ExtractedField(BaseModel, Generic[T]):
    value: Optional[T] = None
    confidence: float = Field(ge=0.0, le=1.0, description="Model estimated confidence score between 0.0 and 1.0")
    reason: Optional[str] = Field(default=None, description="Explanation for low/medium confidence or inference basis")

class BillFields(BaseModel):
    merchant_name: ExtractedField[str]
    date: ExtractedField[str]
    total_amount: ExtractedField[float]
    currency: str = Field(default="INR", description="Currency symbol or code (e.g. INR, USD, EUR, etc.)")
    category: ExtractedField[BillCategoryEnum]

class BillAnalysisResponse(BaseModel):
    scan_id: Optional[str] = Field(default=None, description="SQLite record identifier where structured output is persisted")
    classification: ClassificationEnum
    classification_confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    non_bill_type: Optional[str] = Field(default=None, description="Detailed category if classified as NON_BILL (e.g. ID card, selfie, unclear image)")
    fields: Optional[BillFields] = None
    is_duplicate: bool = Field(default=False, description="Flag indicating if a bill with same merchant and amount was already scanned")
    duplicate_warning: Optional[str] = Field(default=None, description="Explanation message if duplicate bill is detected")

class HealthResponse(BaseModel):
    status: str
    gemini_configured: bool
    model_name: str
    version: str = "1.0.0"

