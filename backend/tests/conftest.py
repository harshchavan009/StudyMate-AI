"""Pytest fixtures for StudyMate AI backend tests."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.rate_limit import limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset rate limiter state before each test run."""
    limiter.reset()
    yield


@pytest.fixture
def client():
    """Test client fixture."""
    with TestClient(app) as test_client:
        yield test_client

