"""Main FastAPI application entry point for StudyMate AI."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.api.rate_limit import limiter, rate_limit_exceeded_handler
from app.api.endpoints import router as api_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("studymate.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle events."""
    logger.info("Starting StudyMate AI backend in %s mode.", settings.ENVIRONMENT)
    if settings.is_production and not settings.GEMINI_API_KEY:
        error_msg = "FATAL: GEMINI_API_KEY environment variable is required in production mode."
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    if not settings.GEMINI_API_KEY:
        logger.warning(
            "Notice: GEMINI_API_KEY is not configured. AI endpoints will return HTTP 503."
        )
    else:
        from app.services.gemini_service import verify_gemini_model_exists
        try:
            verify_gemini_model_exists(settings.GEMINI_MODEL, settings.GEMINI_API_KEY)
            logger.info(
                "Gemini API key loaded successfully. Verified active model: %s",
                settings.GEMINI_MODEL,
            )
        except Exception as exc:
            logger.error("Startup model verification failed: %s", exc)
            raise
    logger.info("Allowed CORS origins: %s", settings.allowed_origins)
    yield
    logger.info("Shutting down StudyMate AI backend.")


# In production, disable interactive docs to prevent endpoint discovery
app_kwargs = {
    "title": "StudyMate AI API",
    "version": "1.0.0",
    "lifespan": lifespan,
}
if settings.is_production:
    app_kwargs.update({
        "openapi_url": None,
        "docs_url": None,
        "redoc_url": None,
    })

app = FastAPI(**app_kwargs)

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


# ---------------------------------------------------------
# Security Headers Middleware
# ---------------------------------------------------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'; object-src 'none';"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)

# ---------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)


# ---------------------------------------------------------
# Custom Exception Handlers (Standard Error Envelope)
# ---------------------------------------------------------
HTTP_STATUS_CODE_NAMES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMIT_EXCEEDED",
    500: "INTERNAL_SERVER_ERROR",
    502: "BAD_GATEWAY",
    503: "SERVICE_UNAVAILABLE",
    504: "GATEWAY_TIMEOUT",
}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Sanitize validation errors and return clear, actionable field messages."""
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error.get("loc", []))
        msg = error.get("msg", "Invalid value")
        errors.append({"field": field, "message": msg})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT if hasattr(status, "HTTP_422_UNPROCESSABLE_CONTENT") else 422,
        content={
            "success": False,
            "detail": "Input validation failed. Please check the submitted fields.",
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed. Please check the submitted fields.",
                "details": errors,
            },
            "errors": errors,
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Uniform envelope for HTTPExceptions."""
    code = HTTP_STATUS_CODE_NAMES.get(exc.status_code, "HTTP_ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "detail": exc.detail,
            "error": {
                "code": code,
                "message": exc.detail,
                "details": None,
            },
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch unhandled server errors and avoid exposing stack traces."""
    logger.error("Unhandled internal exception on %s: %s", request.url.path, str(exc), exc_info=True)
    msg = "An internal server error occurred. Our team has been alerted."
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "detail": msg,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": msg,
                "details": None,
            },
        },
    )


@app.get("/health")
def root_health():
    return {"status": "ok", "service": "StudyMate AI Backend"}


# Include API routes
app.include_router(api_router)

