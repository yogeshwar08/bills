import os
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

from app.api.endpoints import router as api_router
from app.utils.logger import logger

app = FastAPI(
    title="Bill Snap API",
    description="Backend service for AI-powered bill verification and financial information extraction.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration - explicit origins when allow_credentials=True
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error_code": "REQUEST_VALIDATION_ERROR",
            "message": "The submitted request data is invalid.",
            "details": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception on %s: %s", request.url.path, str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An internal server error occurred. Please try again later."
        }
    )

app.include_router(api_router, prefix="/api")

@app.get("/", tags=["Root"])
def root():
    return {
        "app": "Bill Snap API",
        "version": "1.0.0",
        "status": "running",
        "description": "Mobile-first AI bill scanner and local financial extractor",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
