"""Configuration module for StudyMate AI backend."""

import os
from typing import List, Set
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, field_validator


# Officially supported models per Google Gen AI SDK documentation
SUPPORTED_GEMINI_MODELS: Set[str] = {
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-1.0-pro",
}


class Settings(BaseSettings):
    """Application settings and environment validation."""

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    FRONTEND_URL: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    RATE_LIMIT_DEFAULT: str = "30/minute"
    RATE_LIMIT_AI_ENDPOINTS: str = "15/minute"

    model_config = ConfigDict(env_file=".env", extra="ignore")

    @field_validator("GEMINI_MODEL")
    @classmethod
    def validate_gemini_model(cls, v: str) -> str:
        cleaned = v.strip()
        if cleaned not in SUPPORTED_GEMINI_MODELS:
            supported = ", ".join(sorted(SUPPORTED_GEMINI_MODELS))
            raise ValueError(
                f"Configured GEMINI_MODEL '{cleaned}' is not supported. "
                f"Supported Google Gen AI models are: {supported}"
            )
        return cleaned

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def allowed_origins(self) -> List[str]:
        origins = [self.FRONTEND_URL.rstrip("/")]
        # In non-production, allow local vite ports
        if not self.is_production:
            origins.extend([
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ])
        # Deduplicate while preserving order
        seen = set()
        unique_origins = []
        for origin in origins:
            if origin and origin not in seen:
                seen.add(origin)
                unique_origins.append(origin)
        return unique_origins


settings = Settings()
