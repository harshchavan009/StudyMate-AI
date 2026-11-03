"""Rate limiting configuration using slowapi."""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse
from app.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Friendly 429 response when IP exceeds request limit."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "You have submitted several requests in a short time. Please wait a moment before trying again.",
            "type": "rate_limit_exceeded",
        },
    )
