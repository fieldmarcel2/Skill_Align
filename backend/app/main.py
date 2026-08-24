"""
SkillAlign Backend Application
==============================

FastAPI entry point configuring:
- CORS middleware for React / Vite frontend
- Global exception handlers
- API route inclusion
- Interactive API documentation (/docs and /redoc)
"""

import os
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers import auth, users, skills, jobs, candidates, matching

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="SkillAlign — Intelligent Recruitment and Candidate-Job Matching Platform",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS Middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Ensure Upload Directory Exists ───────────────────────────────────────────
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)

# ── Include API Routers ──────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(skills.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(matching.router)


# ── Global Health Endpoint ───────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    """Liveness check returning current service health status."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


# ── Standardised Error Handlers ──────────────────────────────────────────────
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Fallback handler to prevent raw stack trace exposure to API clients."""
    if settings.DEBUG:
        # In debug mode, return error details for development
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Internal Server Error: {str(exc)}"}
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )
