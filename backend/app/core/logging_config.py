"""
SkillAlign - Centralized Application Logging Configuration
==========================================================

Production-grade centralized logging framework providing:
- Structured JSON logging to persistent historical calendar-day directories:
    logs/YYYY/MM/DD/
        ├── application.log   (General application lifecycle & domain events)
        ├── error.log         (ERROR and CRITICAL events with stack traces)
        ├── warning.log       (WARNING events, recoverable issues, slow requests)
        ├── access.log        (HTTP request/response telemetry with duration_ms)
        └── security.log      (Auth/security events: login, token, RBAC)
- Human-readable  terminal output for real-time development debugging
- Automated 24-hour daily directory rollover based on configured timezone
- Maximum file size protection (in-day rotation to .1, .2, etc.)
- Configurable historical log retention cleanup
- Centralized secret redaction & PII protection
- Request ID & user context propagation via async-safe ContextVars
- Health check request filtering (drops successful health checks from logs)
- Safe, non-crashing fail-safe error handling
"""
from __future__ import annotations

import os
import json
import logging
import logging.handlers
import re
import shutil
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Optional

_LOGGING_CONFIGURED = False

# Keys that must ALWAYS have their values redacted
_SENSITIVE_KEYS: frozenset[str] = frozenset({
    "password", "password_hash", "authorization", "access_token",
    "refresh_token", "jwt", "token", "otp", "api_key", "secret_key",
    "client_secret", "aws_access_key_id", "aws_secret_access_key",
    "database_url", "db_url", "cookie", "set-cookie", "session",
    "offer_token", "secure_access_token_hash", "slot_token",
    "password_reset_token", "token_hash", "sendgrid_api_key",
    "twilio_auth_token", "gemini_api_key", "credentials", "credential",
    "private_key", "secret", "auth_token",
})
_REDACTED = "[REDACTED]"

# Regex patterns for string-level redaction
_REDACT_PATTERNS = [
    # Key-value pairs: password="xyz", token: 'abc', secret=123
    re.compile(
        r'(?i)(password|password_hash|passwd|pwd|secret|secret_key|token|access_token|refresh_token|jwt|api_key|apikey|auth_token|otp|authorization|offer_token)\s*[:=]\s*["\']?([^\s,"\'{}]+)["\']?'
    ),
    # Bearer tokens: Bearer eyJ...
    re.compile(r'(?i)(bearer\s+)([A-Za-z0-9_\-\.]{15,})'),
    # Database connection URLs: postgresql://user:password@host:port/db
    re.compile(r'(?i)(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)'),
    # AWS Secret Access Keys: 40-character base64-like strings
    re.compile(r'(?i)(aws_secret_access_key\s*[:=]\s*["\']?)([A-Za-z0-9/+=]{40})(["\']?)'),
]


def _redact_string(text: str) -> str:
    """Sanitize secrets from arbitrary string content."""
    if not isinstance(text, str) or not text:
        return text

    # Pattern 1: key-value matches
    for pattern in _REDACT_PATTERNS:
        if pattern.pattern.startswith("(?i)(postgres"):
            text = pattern.sub(r'\1[REDACTED]\3', text)
        elif pattern.pattern.startswith("(?i)(bearer"):
            text = pattern.sub(r'\1[REDACTED]', text)
        elif pattern.pattern.startswith("(?i)(aws_secret"):
            text = pattern.sub(r'\1[REDACTED]\3', text)
        else:
            text = pattern.sub(rf'\1={_REDACTED}', text)

    return text


def _redact_data(obj: Any) -> Any:
    """Recursively redact sensitive keys in dictionaries, lists, and primitives."""
    if isinstance(obj, dict):
        cleaned: dict[str, Any] = {}
        for k, v in obj.items():
            k_str = str(k).lower().replace("-", "_")
            if any(sens in k_str for sens in _SENSITIVE_KEYS):
                cleaned[k] = _REDACTED
            else:
                cleaned[k] = _redact_data(v)
        return cleaned
    elif isinstance(obj, (list, tuple, set)):
        items = [_redact_data(x) for x in obj]
        return type(obj)(items) if not isinstance(obj, set) else set(items)
    elif isinstance(obj, str):
        return _redact_string(obj)
    return obj


class RedactionFilter(logging.Filter):
    """
    Sanitizes log records to guarantee that sensitive credentials, tokens,
    and passwords never reach log files or stdout.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        try:
            # 1. Redact direct record attributes
            for attr in list(vars(record).keys()):
                attr_lower = attr.lower().replace("-", "_")
                if any(sens in attr_lower for sens in _SENSITIVE_KEYS):
                    setattr(record, attr, _REDACTED)
                else:
                    val = getattr(record, attr)
                    if isinstance(val, (dict, list, tuple)):
                        setattr(record, attr, _redact_data(val))

            # 2. Redact message string
            if isinstance(record.msg, str):
                record.msg = _redact_string(record.msg)

            # 3. Redact args
            if record.args:
                if isinstance(record.args, dict):
                    record.args = _redact_data(record.args)
                elif isinstance(record.args, (tuple, list)):
                    record.args = tuple(_redact_data(a) for a in record.args)
        except Exception:
            pass
        return True


class AccessLogFilter(logging.Filter):
    """Matches HTTP access log records."""
    def filter(self, record: logging.LogRecord) -> bool:
        return getattr(record, "category", None) == "access"


class SecurityLogFilter(logging.Filter):
    """Matches authentication and security-relevant log records."""
    def filter(self, record: logging.LogRecord) -> bool:
        category = getattr(record, "category", None)
        if category == "security":
            return True
        if record.name.startswith("skillalign.security"):
            return True
        return False


class HealthCheckFilter(logging.Filter):
    """Drops successful (2xx) health check probes from access logs."""
    _HEALTH_PATHS = frozenset({"/health", "/healthz", "/ready", "/ping"})

    def filter(self, record: logging.LogRecord) -> bool:
        path = getattr(record, "path", "")
        status_code = getattr(record, "status_code", 0)
        if path in self._HEALTH_PATHS and 200 <= status_code < 300:
            return False
        return True


class ErrorOnlyFilter(logging.Filter):
    """Matches ERROR and CRITICAL level records."""
    def filter(self, record: logging.LogRecord) -> bool:
        return record.levelno >= logging.ERROR


class WarningOnlyFilter(logging.Filter):
    """Matches WARNING level records."""
    def filter(self, record: logging.LogRecord) -> bool:
        return record.levelno == logging.WARNING


class NonAccessSecurityFilter(logging.Filter):
    """Matches general application records (excludes access and security)."""
    def filter(self, record: logging.LogRecord) -> bool:
        category = getattr(record, "category", None)
        if category in ("access", "security"):
            return False
        if record.name.startswith("skillalign.security"):
            return False
        return True


class JSONFormatter(logging.Formatter):
    """
    Serializes LogRecord instances into structured JSON lines.
    Ensures compatibility with Loki, ELK, OpenSearch, and CloudWatch.
    """
    def __init__(self, tz_name: str = "UTC") -> None:
        super().__init__()
        self._tz_name = tz_name
        try:
            import zoneinfo
            self._tz = zoneinfo.ZoneInfo(tz_name)
        except Exception:
            self._tz = timezone.utc

    def format(self, record: logging.LogRecord) -> str:
        try:
            now = datetime.now(self._tz)
        except Exception:
            now = datetime.now(timezone.utc)

        record_dict: dict[str, Any] = {
            "timestamp": now.isoformat(),
            "level": record.levelname,
            "logger": record.name,
        }

        event = getattr(record, "event", None)
        if event:
            record_dict["event"] = event

        try:
            record_dict["message"] = record.getMessage()
        except Exception:
            record_dict["message"] = str(record.msg)

        # Correlation: Request ID
        rid = getattr(record, "request_id", None)
        if not rid:
            try:
                from app.core.request_context import get_request_id
                ctx_rid = get_request_id()
                if ctx_rid and ctx_rid != "no-request-id":
                    rid = ctx_rid
            except Exception:
                rid = None
        if rid:
            record_dict["request_id"] = rid

        # User Context
        user_id = getattr(record, "user_id", None)
        user_role = getattr(record, "user_role", None)
        if user_id is None or user_role is None:
            try:
                from app.core.request_context import get_user_id, get_user_role
                if user_id is None:
                    user_id = get_user_id()
                if user_role is None:
                    user_role = get_user_role()
            except Exception:
                pass
        if user_id is not None:
            record_dict["user_id"] = user_id
        if user_role is not None:
            record_dict["user_role"] = user_role

        # Extra domain context fields
        _CONTEXT_FIELDS = (
            "candidate_id", "job_id", "match_id", "match_result_id",
            "interview_id", "offer_id", "resume_id", "notification_id",
            "task_id", "duration_ms", "status_code", "method", "path",
            "status", "exception_type", "category", "client_ip",
            "file_type", "s3_key", "skills_count", "total_candidates",
            "match_count",
        )
        for field in _CONTEXT_FIELDS:
            val = getattr(record, field, None)
            if val is not None:
                record_dict[field] = val

        # Pull any dynamic domain context fields
        try:
            from app.core.request_context import get_all_context_fields
            for k, v in get_all_context_fields().items():
                if k not in record_dict and v is not None:
                    record_dict[k] = v
        except Exception:
            pass

        # Stack trace & exception details
        if record.exc_info:
            record_dict["traceback"] = self.formatException(record.exc_info)
            exc_obj = record.exc_info[1]
            if exc_obj is not None:
                record_dict["exception_type"] = type(exc_obj).__name__

        # Final redaction check before serialization
        clean_dict = _redact_data(record_dict)

        try:
            return json.dumps(clean_dict, default=str, ensure_ascii=False)
        except Exception:
            return json.dumps({
                "timestamp": now.isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": str(record.msg),
            })


_LEVEL_COLORS = {
    "DEBUG":    "\033[36m",  # Cyan
    "INFO":     "\033[32m",  # Green
    "WARNING":  "\033[33m",  # Yellow
    "ERROR":    "\033[31m",  # Red
    "CRITICAL": "\033[35m",  # Magenta
}
_RESET = "\033[0m"


class ConsoleFormatter(logging.Formatter):
    """
    Human-readable terminal formatter for real-time development logging.
    Format:
      YYYY-MM-DD HH:MM:SS | LEVEL    | logger | req=... | user_id=... | message
    """
    def __init__(self, use_color: bool = True) -> None:
        super().__init__()
        self._use_color = use_color and sys.stderr.isatty()

    def format(self, record: logging.LogRecord) -> str:
        try:
            ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            ts = "??:??:??"

        level = record.levelname
        if self._use_color:
            color = _LEVEL_COLORS.get(level, "")
            level_str = f"{color}{level:<8}{_RESET}"
        else:
            level_str = f"{level:<8}"

        try:
            msg = record.getMessage()
        except Exception:
            msg = str(record.msg)

        rid = getattr(record, "request_id", None)
        if not rid:
            try:
                from app.core.request_context import get_request_id
                ctx_rid = get_request_id()
                if ctx_rid and ctx_rid != "no-request-id":
                    rid = ctx_rid
            except Exception:
                rid = None

        parts = [ts, level_str, record.name]
        if rid:
            parts.append(f"req={rid}")

        for field in ("user_id", "candidate_id", "job_id", "duration_ms"):
            val = getattr(record, field, None)
            if val is not None:
                parts.append(f"{field}={val}")

        parts.append(msg)
        line = " | ".join(parts)

        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)

        return line


class DailyDirectoryHandler(logging.handlers.BaseRotatingHandler):
    """
    Writes structured logs to logs/YYYY/MM/DD/<filename>.
    Automatically rolls over to a new directory at midnight or when the file
    exceeds max_bytes (rotating to filename.1, filename.2 inside the day folder).
    """

    def __init__(
        self,
        base_dir: str,
        filename: str,
        max_bytes: int = 50 * 1024 * 1024,
        tz_name: str = "UTC",
        delay: bool = True,
        retention_days: int = 30,
    ) -> None:
        self._base_dir = Path(base_dir)
        self._log_filename = filename
        self._max_bytes = max_bytes
        self._retention_days = retention_days
        try:
            import zoneinfo
            self._tz = zoneinfo.ZoneInfo(tz_name)
        except Exception:
            self._tz = timezone.utc

        self._current_date: Optional[str] = None
        self._current_path: Optional[Path] = None

        current_path = self._resolve_current_path()
        super().__init__(str(current_path), mode="a", encoding="utf-8", delay=delay)

    def _today_str(self) -> str:
        try:
            return datetime.now(self._tz).strftime("%Y/%m/%d")
        except Exception:
            return datetime.now(timezone.utc).strftime("%Y/%m/%d")

    def _resolve_current_path(self) -> Path:
        date_str = self._today_str()
        dir_path = self._base_dir / date_str
        try:
            dir_path.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass
        self._current_date = date_str
        path = dir_path / self._log_filename
        self._current_path = path
        return path

    def shouldRollover(self, record: logging.LogRecord) -> bool:
        if self._today_str() != self._current_date:
            return True
        if self._max_bytes > 0 and self._current_path is not None:
            try:
                if self._current_path.exists() and self._current_path.stat().st_size >= self._max_bytes:
                    return True
            except Exception:
                pass
        return False

    def doRollover(self) -> None:
        try:
            if self.stream:
                self.stream.flush()
                self.stream.close()
                self.stream = None  # type: ignore[assignment]
        except Exception:
            pass

        if self._today_str() != self._current_date:
            # Date rollover: create new day directory
            new_path = self._resolve_current_path()
            self.baseFilename = str(new_path)
            # Run retention cleanup on day rollover
            try:
                _cleanup_old_logs(self._base_dir, self._retention_days)
            except Exception:
                pass
        else:
            # Size rollover within the same day
            if self._current_path is not None and self._current_path.exists():
                base = self._current_path
                suffix = 1
                while (base.parent / f"{base.name}.{suffix}").exists():
                    suffix += 1
                rotated = base.parent / f"{base.name}.{suffix}"
                try:
                    base.rename(rotated)
                except Exception:
                    pass
            self.baseFilename = str(self._current_path)

        if not self.delay:
            try:
                self.stream = self._open()
            except Exception:
                pass

    def emit(self, record: logging.LogRecord) -> None:
        """Fail-safe log record emission."""
        try:
            super().emit(record)
        except Exception:
            self.handleError(record)


def _cleanup_old_logs(base_dir: Path, retention_days: int) -> None:
    """
    Remove daily log directories (YYYY/MM/DD) older than retention_days.
    Safely prunes empty month/year parent directories.
    """
    if retention_days <= 0 or not base_dir.exists():
        return
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    try:
        for year_dir in sorted(base_dir.iterdir()):
            if not year_dir.is_dir() or not year_dir.name.isdigit():
                continue
            for month_dir in sorted(year_dir.iterdir()):
                if not month_dir.is_dir() or not month_dir.name.isdigit():
                    continue
                for day_dir in sorted(month_dir.iterdir()):
                    if not day_dir.is_dir() or not day_dir.name.isdigit():
                        continue
                    try:
                        dir_date = datetime(
                            int(year_dir.name),
                            int(month_dir.name),
                            int(day_dir.name),
                            tzinfo=timezone.utc,
                        )
                        if dir_date < cutoff:
                            shutil.rmtree(day_dir, ignore_errors=True)
                    except Exception:
                        pass
                # Remove empty month dir
                try:
                    if not any(month_dir.iterdir()):
                        month_dir.rmdir()
                except Exception:
                    pass
            # Remove empty year dir
            try:
                if not any(year_dir.iterdir()):
                    year_dir.rmdir()
            except Exception:
                pass
    except Exception:
        pass


def setup_logging(
    *,
    log_level: str = "INFO",
    log_directory: str = "logs",
    log_timezone: str = "Asia/Kolkata",
    console_enabled: bool = True,
    file_enabled: bool = True,
    max_file_size_mb: int = 50,
    retention_days: int = 30,
    force: bool = False,
) -> None:
    """
    Configure the SkillAlign centralized application logging system.

    Call this ONCE at application startup. Safe to call multiple times.
    Pass `force=True` in tests to reconfigure handlers.
    """
    global _LOGGING_CONFIGURED
    if _LOGGING_CONFIGURED and not force:
        return
    _LOGGING_CONFIGURED = True

    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    max_bytes = max_file_size_mb * 1024 * 1024
    base_dir = Path(log_directory)

    if file_enabled:
        try:
            _cleanup_old_logs(base_dir, retention_days)
        except Exception:
            pass

    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    root_logger.handlers.clear()

    redaction_filter = RedactionFilter()
    json_fmt = JSONFormatter(tz_name=log_timezone)
    console_fmt = ConsoleFormatter(use_color=True)

    if console_enabled:
        console_handler = logging.StreamHandler(sys.stderr)
        console_handler.setLevel(numeric_level)
        console_handler.setFormatter(console_fmt)
        console_handler.addFilter(redaction_filter)
        root_logger.addHandler(console_handler)

    if file_enabled:
        def _make_handler(fname: str) -> DailyDirectoryHandler:
            h = DailyDirectoryHandler(
                base_dir=str(base_dir),
                filename=fname,
                max_bytes=max_bytes,
                tz_name=log_timezone,
                delay=True,
                retention_days=retention_days,
            )
            h.setFormatter(json_fmt)
            h.addFilter(redaction_filter)
            return h

        # 1. application.log - general application events (excluding access/security)
        app_h = _make_handler("application.log")
        app_h.setLevel(numeric_level)
        app_h.addFilter(NonAccessSecurityFilter())
        root_logger.addHandler(app_h)

        # 2. error.log - ERROR and CRITICAL only
        err_h = _make_handler("error.log")
        err_h.setLevel(logging.ERROR)
        err_h.addFilter(ErrorOnlyFilter())
        root_logger.addHandler(err_h)

        # 3. warning.log - WARNING only
        warn_h = _make_handler("warning.log")
        warn_h.setLevel(logging.WARNING)
        warn_h.addFilter(WarningOnlyFilter())
        root_logger.addHandler(warn_h)

        # 4. access.log - HTTP request/response telemetry
        access_h = _make_handler("access.log")
        access_h.setLevel(logging.INFO)
        access_h.addFilter(AccessLogFilter())
        access_h.addFilter(HealthCheckFilter())
        root_logger.addHandler(access_h)

        # 5. security.log - Auth and security events
        sec_h = _make_handler("security.log")
        sec_h.setLevel(logging.INFO)
        sec_h.addFilter(SecurityLogFilter())
        root_logger.addHandler(sec_h)

    # Silence noisy third-party loggers
    for noisy in (
        "uvicorn.access", "sqlalchemy.engine", "sqlalchemy.pool",
        "passlib", "httpx", "celery.app.trace", "amqp", "kombu",
    ):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)

    # Ensure all skillalign.* loggers propagate to root
    for name in (
        "skillalign", "skillalign.main", "skillalign.api",
        "skillalign.auth", "skillalign.security", "skillalign.matching",
        "skillalign.resume", "skillalign.storage", "skillalign.workflow",
        "skillalign.notifications", "skillalign.gemini", "skillalign.database",
        "skillalign.tasks", "skillalign.admin", "skillalign.extractor",
        "skillalign.offer_pdf", "skillalign.job_service",
        "skillalign.storage.s3", "skillalign.storage.local",
        "skillalign.workflow.router", "skillalign.resume_router",
        "skillalign.matching_router", "skillalign.communication",
        "skillalign.candidate_service", "skillalign.recruiter",
    ):
        logging.getLogger(name).propagate = True

    logging.getLogger("skillalign.main").info(
        "Logging system initialized",
        extra={
            "event": "logging_initialized",
            "log_level": log_level,
            "log_directory": str(base_dir.resolve()),
            "log_timezone": log_timezone,
            "file_enabled": file_enabled,
            "retention_days": retention_days,
            "max_file_size_mb": max_file_size_mb,
        },
    )
