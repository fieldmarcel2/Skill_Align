"""
SkillAlign Backend — Enterprise Application Entry Point
=======================================================

FastAPI configuration with:
- CORS middleware (origin-restricted)
- Security headers middleware (CSP, HSTS, X-Frame-Options)
- Rate limiting (slowapi)
- Request ID logging middleware
- Environment-gated API documentation
- Standardised global error handlers
"""

import os
import uuid
import time
import logging
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter
from app.routers import (
    auth, users, skills, jobs, candidates, matching, interviews,
    notifications, match_results, resume, recruiter, communication, tasks
)
from app.routers import admin as admin_router
from app.routers.workflow import router as workflow_router, offer_router

logger = logging.getLogger("skillalign.main")

# ── Determine if running in production ──────────────────────────────────────
IS_PRODUCTION = not settings.DEBUG


# ── Security Headers Middleware ──────────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds enterprise-grade security headers to every response.
    Prevents clickjacking, MIME sniffing, XSS and enforces HTTPS in production.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Disable browser features we don't need
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=(), usb=()"
        )
        # XSS protection for older browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # HSTS (only in production with HTTPS)
        if IS_PRODUCTION:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Remove server identification
        if "server" in response.headers:
            del response.headers["server"]

        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Assigns a unique request ID to every incoming request.
    The ID is logged and returned in the response header for traceability.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = (time.perf_counter() - start_time) * 1000

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{process_time:.2f}ms"

        logger.info(
            "request=%s method=%s path=%s status=%d duration=%.2fms",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            process_time,
        )
        return response


# ── FastAPI Application ──────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "SkillAlign — Enterprise Talent Intelligence & Recruitment Automation Platform. "
        "Powering data-driven hiring decisions at scale."
    ),
    # Restrict interactive documentation to non-production environments
    docs_url="/docs" if not IS_PRODUCTION else None,
    redoc_url="/redoc" if not IS_PRODUCTION else None,
    openapi_url="/openapi.json" if not IS_PRODUCTION else None,
)

# ── Middleware Stack (order matters — outermost applied last) ────────────────
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time"],
)

# ── Rate Limiter ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Ensure Upload Directory Exists ───────────────────────────────────────────
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)

# ── Include API Routers ──────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(skills.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(resume.router)
app.include_router(matching.router)
app.include_router(match_results.router)
app.include_router(interviews.router)
app.include_router(notifications.router)
app.include_router(admin_router.router)
app.include_router(recruiter.router)
app.include_router(recruiter.claims_router)
app.include_router(communication.router)
app.include_router(tasks.router)
app.include_router(workflow_router)
app.include_router(offer_router)


# ── Health Check Endpoint ────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health_check():
    """Liveness probe — returns service status and version."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": "development" if settings.DEBUG else "production",
    }


# ── Global Error Handlers ────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    Fallback handler that prevents raw stack trace exposure to API consumers.
    In DEBUG mode returns error details for development convenience.
    In production returns a generic safe message.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        "Unhandled exception request=%s path=%s: %s",
        request_id,
        request.url.path,
        str(exc),
        exc_info=True,
    )

    if settings.DEBUG:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": f"Internal Server Error: {str(exc)}",
                "request_id": request_id,
            },
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred. Our engineering team has been notified.",
            "request_id": request_id,
        },
    )
