"""Rate limiting configuration using slowapi."""

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse
from app.config import settings


def get_client_ip(request: Request) -> str:
    """Extract client IP respecting X-Forwarded-For proxy headers when present."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


limiter = Limiter(
    key_func=get_client_ip,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Friendly 429 response when IP exceeds request limit."""
    msg = "You have submitted several requests in a short time. Please wait a moment before trying again."
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "detail": msg,
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": msg,
                "details": None,
            },
            "type": "rate_limit_exceeded",
        },
    )

