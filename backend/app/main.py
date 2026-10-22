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
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings

# ── Logging must be initialised BEFORE any other import that creates a logger ──
from app.core.logging_config import setup_logging
setup_logging(
    log_level=settings.LOG_LEVEL,
    log_directory=settings.LOG_DIRECTORY,
    log_timezone=settings.LOG_TIMEZONE,
    console_enabled=settings.LOG_CONSOLE_ENABLED,
    file_enabled=settings.LOG_FILE_ENABLED,
    max_file_size_mb=settings.LOG_MAX_FILE_SIZE_MB,
    retention_days=settings.LOG_RETENTION_DAYS,
)

from app.core.rate_limit import limiter
from app.core.request_context import set_request_id, get_request_id
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
    Assigns a unique request ID to every incoming request and emits an
    access log record after the response is sent.

    Behavior:
    1. If X-Request-ID header is present and safe (alphanumeric/hyphen/underscore,
       ≤128 chars) it is reused for distributed tracing correlation.
    2. Otherwise a new 8-char hex UUID4 ID is generated.
    3. The ID is stored in an async-safe ContextVar (no shared global state).
    4. X-Request-ID and X-Response-Time are returned in the response.
    5. An access log record (category='access') is emitted after each request.
    6. Requests exceeding LOG_SLOW_REQUEST_THRESHOLD_MS emit an extra WARNING.
    """

    _access_logger = logging.getLogger("skillalign.api")
    _SKIP_ACCESS_LOG = frozenset({"/health", "/healthz", "/ready", "/ping"})

    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("X-Request-ID")
        request_id = set_request_id(incoming)
        request.state.request_id = request_id

        # Emit DEBUG-level request start log for full lifecycle tracing
        logger.debug(
            "%s %s — request received",
            request.method,
            request.url.path,
            extra={
                "event": "request_started",
                "stage": "request_received",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else None,
            },
        )

        start_time = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

        path = request.url.path
        status_code = response.status_code
        client_ip = request.client.host if request.client else None

        # Always log — the HealthCheckFilter in the access handler drops
        # successful /health pings automatically
        self._access_logger.info(
            "%s %s %d %.2fms",
            request.method,
            path,
            status_code,
            duration_ms,
            extra={
                "event": "http_request",
                "stage": "response",
                "category": "access",
                "request_id": request_id,
                "method": request.method,
                "path": path,
                "status_code": status_code,
                "duration_ms": duration_ms,
                "client_ip": client_ip,
            },
        )

        # Slow-request warning
        threshold = settings.LOG_SLOW_REQUEST_THRESHOLD_MS
        if duration_ms > threshold:
            self._access_logger.warning(
                "Slow request: %s %s took %.2fms (threshold %dms)",
                request.method,
                path,
                duration_ms,
                threshold,
                extra={
                    "event": "slow_request",
                    "request_id": request_id,
                    "method": request.method,
                    "path": path,
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                },
            )

        return response


# ── FastAPI Application ──────────────────────────────────────────────────────

_DESCRIPTION = """
## SkillAlign API

**Enterprise Talent Intelligence & Recruitment Automation Platform**

SkillAlign automates and orchestrates the full recruitment lifecycle — from job
requisition creation and AI-powered candidate matching to structured interview
scheduling, hiring-manager reviews, offer management, and onboarding initiation.

---

### Authentication

All protected endpoints require a **JWT Bearer token**.

1. Call `POST /api/auth/login` with your email and password.
2. Copy the returned `access_token`.
3. Click the **Authorize 🔒** button (top-right) and enter: `<your_token>` *(without "Bearer " prefix)*.
4. All subsequent requests will include the token automatically.

JWT tokens expire after **60 minutes** by default. Use `POST /api/auth/refresh` to
obtain a fresh token without re-authenticating.

---

### Role-Based Access Control (RBAC)

| Role      | Description                                               |
|-----------|-----------------------------------------------------------|
| **Admin** | Platform super-user. Full system access.                  |
| **HR**    | Creates job requisitions, approves candidates, schedules interviews, manages offers. |
| **Recruiter** | Sources candidates, screens profiles, claims candidates, manages tasks. |
| **Candidate** | Self-registers, maintains own profile and resume, views own pipeline & offers. |

---

### Core API Modules

| Module | Description |
|---|---|
| **Authentication** | JWT login, OTP phone login, password reset, token refresh & revocation |
| **Users** | Admin-managed user provisioning (HR / Recruiter accounts) |
| **Skills** | Skill master data (create / list / update / delete) |
| **Jobs** | Job requisition lifecycle managed by HR |
| **Candidates** | Candidate profile and self-service skill management |
| **Candidate Resumes** | Async resume upload → S3 storage → text extraction → AI parsing → auto-matching |
| **Matching Engine** | AI-powered candidate-job scoring with fit/skill/experience/education scores |
| **Match Results** | Pipeline state management (Matched → Screened → HR Approved → Interview → Offer → Hired) |
| **Interviews** | Interview scheduling, slot selection, and feedback collection |
| **Workflow** | Full recruitment state machine: shortlisting → HM review → interview → offer → hire |
| **Offers** | Compensation offer creation, HM approval, PDF generation, and candidate acceptance |
| **Notifications** | In-app and email notification dispatch and read-state tracking |
| **Recruitment Communication** | Job-level and candidate-level messaging between HR and Recruiters |
| **Recruitment Tasks** | Actionable task management dispatched by HR to Recruiters |
| **Recruiter Operations** | Recruiter dashboard, candidate queue, claiming, and assignment workflows |
| **Admin Management** | Paginated user management, extended profiles, and hiring audit logs |
| **System** | Health check and liveness probe |

---

### Response Format

All endpoints return JSON. Successful responses follow the declared `response_model`.
Validation errors return HTTP **422** with a structured `detail` array.
Authentication errors return HTTP **401**. Authorization failures return HTTP **403**.

---

> **Note:** This documentation is generated directly from the live FastAPI application.
> The OpenAPI specification at `/openapi.json` is always authoritative.
"""

_OPENAPI_TAGS = [
    {
        "name": "Authentication",
        "description": (
            "Public and protected endpoints for email/password login, JWT token management, "
            "phone OTP authentication, and password reset flows."
        ),
    },
    {
        "name": "Users",
        "description": (
            "Admin-only endpoints for provisioning HR and Recruiter accounts, "
            "listing users, and updating account status."
        ),
    },
    {
        "name": "Skills",
        "description": (
            "Skill master data management. Admin can create, update, and delete skills. "
            "All authenticated roles can list and search skills."
        ),
    },
    {
        "name": "Jobs",
        "description": (
            "Job requisition lifecycle. HR creates and manages job postings with skill requirements "
            "and experience thresholds. Recruiters are assigned to jobs by HR."
        ),
    },
    {
        "name": "Candidates",
        "description": (
            "Candidate self-service profile management including personal info, skills, "
            "pipeline status, and hiring journey details."
        ),
    },
    {
        "name": "Candidate Resumes",
        "description": (
            "Async resume upload pipeline: store to S3 → extract text → AI-parse → sync skills → "
            "trigger auto-matching. Supports PDF, DOCX, and TXT."
        ),
    },
    {
        "name": "Matching Engine",
        "description": (
            "AI-powered candidate-job matching. Computes weighted fit scores across skills, "
            "experience, education, work mode preference, and location. Supports manual re-runs."
        ),
    },
    {
        "name": "Match Results",
        "description": (
            "Direct REST alias for match result retrieval and pipeline status updates. "
            "Provides screened candidate listing for HR review."
        ),
    },
    {
        "name": "Interviews",
        "description": (
            "Interview lifecycle management: scheduling, slot-based coordination, "
            "status tracking, and feedback collection. Candidate receives email notification on scheduling."
        ),
    },
    {
        "name": "Workflow",
        "description": (
            "Enterprise recruitment state machine implementing the full hiring pipeline: "
            "shortlist → submit to HM → HM review → interview scheduling → interview evaluation "
            "→ offer creation → offer approval → send offer → hired."
        ),
    },
    {
        "name": "Offers",
        "description": (
            "Compensation offer management: creation (DRAFT), HM approval workflow, "
            "PDF generation, dispatch to candidate, and candidate accept/reject flow."
        ),
    },
    {
        "name": "Notifications",
        "description": (
            "In-app notification management. HR dispatches notifications to candidates. "
            "All authenticated users can view and manage their own notifications."
        ),
    },
    {
        "name": "Recruitment Communication",
        "description": (
            "Contextual messaging between HR and Recruiters scoped to job requisitions "
            "and individual candidate reviews."
        ),
    },
    {
        "name": "Recruitment Tasks",
        "description": (
            "Actionable work-request system: HR assigns tasks to Recruiters on specific "
            "jobs or candidates. Recruiters update task progress."
        ),
    },
    {
        "name": "Recruiter Operations",
        "description": (
            "Recruiter-facing dashboard, assigned job listings, candidate queue management, "
            "and race-condition-safe candidate claiming ('Assign to Me')."
        ),
    },
    {
        "name": "Candidate Claiming",
        "description": (
            "Recruiter candidate claiming and unassignment endpoints exposed under the /api/jobs prefix. "
            "Duplicates key Recruiter Operations endpoints for direct URL-based access."
        ),
    },
    {
        "name": "Admin Management",
        "description": (
            "Admin-only endpoints for paginated user management with search and filters, "
            "extended user detail views, user activation toggle, account deletion, "
            "and comprehensive hiring audit logs."
        ),
    },
    {
        "name": "System",
        "description": "Liveness probe and platform health check.",
    },
]

app = FastAPI(
    title="SkillAlign API",
    version=settings.APP_VERSION,
    description=_DESCRIPTION,
    openapi_tags=_OPENAPI_TAGS,
    contact={
        "name": "SkillAlign Engineering",
        "email": "engineering@skillalign.dev",
    },
    license_info={
        "name": "Proprietary",
    },
    # Restrict interactive documentation to non-production environments
    docs_url="/docs" if not IS_PRODUCTION else None,
    redoc_url="/redoc" if not IS_PRODUCTION else None,
    openapi_url="/openapi.json" if not IS_PRODUCTION else None,
)


def custom_openapi():
    """Extend the generated OpenAPI schema with a JWT Bearer security scheme
    so the Swagger UI 'Authorize' button works for all protected endpoints."""
    if app.openapi_schema:
        return app.openapi_schema
    from fastapi.openapi.utils import get_openapi
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        terms_of_service=app.terms_of_service,
        contact=app.contact,
        license_info=app.license_info,
        tags=app.openapi_tags,
        servers=app.servers,
        routes=app.routes,
    )
    schema.setdefault("components", {})
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": (
                "Enter the JWT access token obtained from POST /api/auth/login. "
                "Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`"
            ),
        }
    }
    # Apply BearerAuth globally to all paths
    for path_data in schema.get("paths", {}).values():
        for operation in path_data.values():
            if isinstance(operation, dict):
                operation.setdefault("security", [{"BearerAuth": []}])
    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi  # type: ignore[method-assign]

# ── Middleware Stack (order matters — outermost applied last) ────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"(https://.*\.vercel\.app|https?://localhost(:\d+)?|https?://127\.0\.0\.1(:\d+)?|null)",
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

    - In DEBUG mode returns error details for development convenience.
    - In production returns a generic safe message.
    - Always includes request_id in the response for log correlation.
    - Emits a structured ERROR log with event=unhandled_exception.
    """
    request_id = get_request_id()
    user_id = None
    user_role = None
    try:
        from app.core.request_context import get_user_id, get_user_role
        user_id = get_user_id()
        user_role = get_user_role()
    except Exception:
        pass

    logger.error(
        "Unhandled exception: %s",
        str(exc),
        exc_info=True,
        extra={
            "event": "unhandled_exception",
            "request_id": request_id,
            "user_id": user_id,
            "user_role": user_role,
            "method": request.method,
            "path": request.url.path,
            "exception_type": type(exc).__name__,
        },
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
