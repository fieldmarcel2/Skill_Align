"""
Convenience entry point forwarding to app.main:app.
Allows running `uvicorn main:app --reload` directly from the backend/ directory.
"""

from app.main import app

__all__ = ["app"]
