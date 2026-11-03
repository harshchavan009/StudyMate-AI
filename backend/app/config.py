"""Configuration module for StudyMate AI backend."""

import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    """Application settings and environment validation."""

    GEMINI_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    RATE_LIMIT_DEFAULT: str = "30/minute"
    RATE_LIMIT_AI_ENDPOINTS: str = "15/minute"

    model_config = ConfigDict(env_file=".env", extra="ignore")

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
