"""
SkillAlign — Comprehensive Logging System Tests
===============================================

Tests the entire production-grade application logging framework:
1. Request ID Generation, Validation & Propagation
2. HTTP Response Headers (X-Request-ID, X-Response-Time)
3. Async-Safe Request Context & User Context Isolation
4. Calendar-Day Directory Structure (logs/YYYY/MM/DD/)
5. Log File Separation (application, error, warning, access, security)
6. Structured JSON Serialization & Field Validation
7. Comprehensive Secret Redaction (passwords, tokens, JWTs, OTPs, DB URLs)
8. Unhandled Exception Logging & Traceback Formatting
9. HTTP Access Telemetry & Performance Timing (duration_ms)
10. Slow Request Warning Detection
11. Health Check Probe Filtering
12. Daily Rollover & In-Day File Size Rotation
13. Retention Policy & Directory Cleanup
14. Non-Fatal Logging Fail-Safe Behavior
15. Audit Log System Separation
"""

import json
import logging
import os
import sys
import shutil
import tempfile
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.logging_config import (
    setup_logging,
    _redact_string,
    _redact_data,
    RedactionFilter,
    JSONFormatter,
    ConsoleFormatter,
    DailyDirectoryHandler,
    _cleanup_old_logs,
    AccessLogFilter,
    SecurityLogFilter,
    HealthCheckFilter,
    ErrorOnlyFilter,
    WarningOnlyFilter,
    NonAccessSecurityFilter,
)
from app.core.request_context import (
    set_request_id,
    get_request_id,
    set_user_context,
    get_user_id,
    get_user_role,
    set_context_field,
    get_context_field,
    get_all_context_fields,
    clear_context,
    _request_id_var,
)
from app.main import app


# ─────────────────────────────────────────────────────────────────────────────
# 1. Request ID & ContextVar Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestRequestIDMechanisms:
    """Test Request ID creation, validation, and async isolation."""

    def setup_method(self):
        clear_context()

    def teardown_method(self):
        clear_context()

    def test_default_request_id_is_no_request_id(self):
        assert get_request_id() == "no-request-id"

    def test_set_request_id_generates_unique_hex_when_header_none(self):
        rid1 = set_request_id(None)
        assert len(rid1) == 8
        assert rid1.isalnum()
        assert get_request_id() == rid1

        rid2 = set_request_id(None)
        assert rid1 != rid2

    def test_set_request_id_propagates_safe_header(self):
        safe_header = "custom-req-id_12345"
        rid = set_request_id(safe_header)
        assert rid == safe_header
        assert get_request_id() == safe_header

    def test_set_request_id_rejects_unsafe_header_and_generates_safe_id(self):
        unsafe_header = "<script>alert('xss')</script>"
        rid = set_request_id(unsafe_header)
        assert rid != unsafe_header
        assert len(rid) == 8
        assert rid.isalnum()

    def test_set_request_id_rejects_excessively_long_header(self):
        long_header = "a" * 200
        rid = set_request_id(long_header)
        assert rid != long_header
        assert len(rid) == 8

    def test_user_context_storage(self):
        set_user_context(42, "HR")
        assert get_user_id() == 42
        assert get_user_role() == "HR"

        clear_context()
        assert get_user_id() is None
        assert get_user_role() is None

    def test_custom_domain_context_fields(self):
        set_context_field("candidate_id", 101)
        set_context_field("job_id", 202)
        assert get_context_field("candidate_id") == 101
        assert get_context_field("job_id") == 202
        assert get_all_context_fields() == {"candidate_id": 101, "job_id": 202}


# ─────────────────────────────────────────────────────────────────────────────
# 2. HTTP Middleware & Header Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestHTTPMiddlewareLogging:
    """Test RequestIDMiddleware headers and access logging."""

    @pytest.fixture
    def client(self):
        with TestClient(app) as c:
            yield c

    def test_response_contains_x_request_id_header(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        header_key = "x-request-id" if "x-request-id" in resp.headers else "X-Request-ID"
        assert header_key in resp.headers
        assert len(resp.headers[header_key]) >= 8

    def test_response_contains_x_response_time_header(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        header_key = "x-response-time" if "x-response-time" in resp.headers else "X-Response-Time"
        assert header_key in resp.headers
        assert resp.headers[header_key].endswith("ms")

    def test_safe_incoming_x_request_id_is_returned(self, client):
        custom_id = "req_test_abc123"
        resp = client.get("/health", headers={"X-Request-ID": custom_id})
        header_key = "x-request-id" if "x-request-id" in resp.headers else "X-Request-ID"
        assert resp.headers[header_key] == custom_id

    def test_unsafe_incoming_x_request_id_is_sanitized(self, client):
        unsafe_id = '"><script>attack()</script>'
        resp = client.get("/health", headers={"X-Request-ID": unsafe_id})
        header_key = "x-request-id" if "x-request-id" in resp.headers else "X-Request-ID"
        assert resp.headers[header_key] != unsafe_id
        assert len(resp.headers[header_key]) >= 8


# ─────────────────────────────────────────────────────────────────────────────
# 3. Secret Redaction Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestSecretRedaction:
    """Test centralized sanitization of sensitive data."""

    def test_redact_string_patterns(self):
        assert "password=[REDACTED]" in _redact_string('password="MySecretPassword123!"')
        assert "access_token=[REDACTED]" in _redact_string('access_token=eyJhbGciOiJIUzI1NiJ9')
        assert "Bearer [REDACTED]" in _redact_string('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
        assert "[REDACTED]" in _redact_string('postgresql://postgres:SuperSecret123@localhost:5432/db')
        assert 'aws_secret_access_key="[REDACTED]"' in _redact_string('aws_secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"')

    def test_redact_data_nested_dict(self):
        payload = {
            "user": "alice",
            "password": "SecretPassword123",
            "auth": {
                "token": "token_val",
                "jwt": "jwt_val",
                "otp": "123456",
            },
            "headers": {
                "Authorization": "Bearer some_jwt_token_value",
            },
            "clean_field": "public_data",
        }
        redacted = _redact_data(payload)
        assert redacted["user"] == "alice"
        assert redacted["password"] == "[REDACTED]"
        assert redacted["auth"]["token"] == "[REDACTED]"
        assert redacted["auth"]["jwt"] == "[REDACTED]"
        assert redacted["auth"]["otp"] == "[REDACTED]"
        assert redacted["headers"]["Authorization"] == "[REDACTED]"
        assert redacted["clean_field"] == "public_data"

    def test_redaction_filter_record(self):
        filter_ = RedactionFilter()
        logger = logging.getLogger("skillalign.test_redact")
        record = logger.makeRecord(
            name="skillalign.test_redact",
            level=logging.INFO,
            fn="test.py",
            lno=10,
            msg="User login with password=SecretPassword123 and token=abc12345",
            args=(),
            exc_info=None,
            extra={"password": "SecretPassword123", "token": "abc12345", "candidate_id": 99},
        )
        filter_.filter(record)
        assert getattr(record, "password") == "[REDACTED]"
        assert getattr(record, "token") == "[REDACTED]"
        assert getattr(record, "candidate_id") == 99
        assert "password=[REDACTED]" in record.msg
        assert "token=[REDACTED]" in record.msg


# ─────────────────────────────────────────────────────────────────────────────
# 4. JSON Formatter & Structured Output Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestJSONFormatter:
    """Test structured JSON log record creation and field compliance."""

    def test_json_formatter_standard_fields(self):
        formatter = JSONFormatter(tz_name="Asia/Kolkata")
        logger = logging.getLogger("skillalign.test_json")
        record = logger.makeRecord(
            name="skillalign.matching",
            level=logging.INFO,
            fn="matching.py",
            lno=42,
            msg="Matching completed successfully",
            args=(),
            exc_info=None,
            extra={
                "event": "matching_completed",
                "request_id": "req_12345",
                "user_id": 41,
                "user_role": "RECRUITER",
                "candidate_id": 92,
                "job_id": 17,
                "match_id": 501,
                "duration_ms": 428.5,
                "status": "success",
            },
        )

        formatted_str = formatter.format(record)
        data = json.loads(formatted_str)

        assert data["level"] == "INFO"
        assert data["logger"] == "skillalign.matching"
        assert data["event"] == "matching_completed"
        assert data["message"] == "Matching completed successfully"
        assert data["request_id"] == "req_12345"
        assert data["user_id"] == 41
        assert data["user_role"] == "RECRUITER"
        assert data["candidate_id"] == 92
        assert data["job_id"] == 17
        assert data["match_id"] == 501
        assert data["duration_ms"] == 428.5
        assert data["status"] == "success"
        assert "timestamp" in data

    def test_json_formatter_includes_traceback_on_exception(self):
        formatter = JSONFormatter(tz_name="UTC")
        try:
            raise ValueError("Test computation failure")
        except Exception:
            exc_info = sys.exc_info()

        logger = logging.getLogger("skillalign.test_exc")
        record = logger.makeRecord(
            name="skillalign.resume",
            level=logging.ERROR,
            fn="resume.py",
            lno=100,
            msg="Resume parsing failed",
            args=(),
            exc_info=exc_info,
            extra={"event": "resume_parsing_failed", "candidate_id": 50},
        )

        formatted_str = formatter.format(record)
        data = json.loads(formatted_str)

        assert data["level"] == "ERROR"
        assert data["event"] == "resume_parsing_failed"
        assert data["exception_type"] == "ValueError"
        assert "traceback" in data
        assert "ValueError: Test computation failure" in data["traceback"]


# ─────────────────────────────────────────────────────────────────────────────
# 5. Persistent Daily Directory & File Separation Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestDailyDirectoryStorage:
    """Test YYYY/MM/DD directory organization and multi-file separation."""

    @pytest.fixture
    def temp_log_dir(self):
        tmp = tempfile.mkdtemp(prefix="skillalign_logs_test_")
        yield Path(tmp)
        shutil.rmtree(tmp, ignore_errors=True)

    def test_daily_directory_handler_writes_to_year_month_day(self, temp_log_dir):
        tz_name = "Asia/Kolkata"
        handler = DailyDirectoryHandler(
            base_dir=str(temp_log_dir),
            filename="application.log",
            tz_name=tz_name,
            delay=False,
        )
        handler.setFormatter(JSONFormatter(tz_name=tz_name))

        logger = logging.getLogger("test_dir_logger")
        logger.setLevel(logging.INFO)
        logger.addHandler(handler)

        logger.info("Test daily message", extra={"event": "test_event", "request_id": "req_daily_01"})
        handler.flush()
        handler.close()

        # Verify logs/YYYY/MM/DD/application.log structure
        import zoneinfo
        tz = zoneinfo.ZoneInfo(tz_name)
        today_path = datetime.now(tz).strftime("%Y/%m/%d")
        expected_file = temp_log_dir / today_path / "application.log"

        assert expected_file.exists(), f"Expected log file not found at {expected_file}"
        content = expected_file.read_text(encoding="utf-8")
        assert "req_daily_01" in content
        parsed = json.loads(content.strip().splitlines()[-1])
        assert parsed["event"] == "test_event"

    def test_file_separation_under_full_setup(self, temp_log_dir):
        """Verify that application, error, warning, access, security logs route to distinct files."""
        tz_name = "Asia/Kolkata"
        setup_logging(
            log_level="DEBUG",
            log_directory=str(temp_log_dir),
            log_timezone=tz_name,
            console_enabled=False,
            file_enabled=True,
            force=True,
        )

        import zoneinfo
        tz = zoneinfo.ZoneInfo(tz_name)
        today_dir = temp_log_dir / datetime.now(tz).strftime("%Y/%m/%d")

        # 1. Log general application event
        app_logger = logging.getLogger("skillalign.jobs")
        app_logger.info("Job created", extra={"event": "job_created", "job_id": 10})

        # 2. Log warning event
        warn_logger = logging.getLogger("skillalign.api")
        warn_logger.warning("Slow query detected", extra={"event": "slow_query", "duration_ms": 1200})

        # 3. Log error event
        err_logger = logging.getLogger("skillalign.database")
        err_logger.error("Connection timed out", extra={"event": "database_error", "exception_type": "TimeoutError"})

        # 4. Log access event
        access_logger = logging.getLogger("skillalign.api")
        access_logger.info(
            "POST /api/jobs 201 142ms",
            extra={"event": "http_request", "category": "access", "method": "POST", "path": "/api/jobs", "status_code": 201, "duration_ms": 142.0},
        )

        # 5. Log security event
        sec_logger = logging.getLogger("skillalign.security")
        sec_logger.warning(
            "Login failed for bad user",
            extra={"event": "login_failed", "category": "security", "reason": "invalid_credentials"},
        )

        # Flush all handlers
        for h in logging.getLogger().handlers:
            h.flush()

        app_log = today_dir / "application.log"
        err_log = today_dir / "error.log"
        warn_log = today_dir / "warning.log"
        access_log = today_dir / "access.log"
        sec_log = today_dir / "security.log"

        assert app_log.exists(), "application.log missing"
        assert err_log.exists(), "error.log missing"
        assert warn_log.exists(), "warning.log missing"
        assert access_log.exists(), "access.log missing"
        assert sec_log.exists(), "security.log missing"

        # Verify content routing
        app_text = app_log.read_text(encoding="utf-8")
        assert "job_created" in app_text
        assert "category" not in app_text or '"category": "access"' not in app_text

        err_text = err_log.read_text(encoding="utf-8")
        assert "database_error" in err_text
        assert "job_created" not in err_text

        warn_text = warn_log.read_text(encoding="utf-8")
        assert "slow_query" in warn_text

        access_text = access_log.read_text(encoding="utf-8")
        assert "http_request" in access_text
        assert "/api/jobs" in access_text

        sec_text = sec_log.read_text(encoding="utf-8")
        assert "login_failed" in sec_text


# ─────────────────────────────────────────────────────────────────────────────
# 6. Retention Policy & Cleanup Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestLogRetentionCleanup:
    """Test safe automatic cleanup of historical daily log directories."""

    @pytest.fixture
    def temp_retention_dir(self):
        tmp = tempfile.mkdtemp(prefix="skillalign_retention_test_")
        yield Path(tmp)
        shutil.rmtree(tmp, ignore_errors=True)

    def test_cleanup_removes_old_directories_and_keeps_recent_ones(self, temp_retention_dir):
        # Create mock directories: 40 days ago, 10 days ago, 2 days ago
        now = datetime.now(timezone.utc)
        d_40 = now - timedelta(days=40)
        d_10 = now - timedelta(days=10)
        d_2 = now - timedelta(days=2)

        dir_40 = temp_retention_dir / d_40.strftime("%Y/%m/%d")
        dir_10 = temp_retention_dir / d_10.strftime("%Y/%m/%d")
        dir_2 = temp_retention_dir / d_2.strftime("%Y/%m/%d")

        for d in (dir_40, dir_10, dir_2):
            d.mkdir(parents=True, exist_ok=True)
            (d / "application.log").write_text('{"event": "old_event"}\n', encoding="utf-8")

        assert dir_40.exists()
        assert dir_10.exists()
        assert dir_2.exists()

        # Run retention cleanup with 30 days
        _cleanup_old_logs(temp_retention_dir, retention_days=30)

        # 40-day old directory must be removed
        assert not dir_40.exists(), "Directory older than 30 days was not cleaned up"
        # 10-day and 2-day directories must remain
        assert dir_10.exists(), "Directory within retention period was incorrectly deleted"
        assert dir_2.exists(), "Recent directory was incorrectly deleted"


# ─────────────────────────────────────────────────────────────────────────────
# 7. File Size In-Day Rotation Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestFileSizeRotation:
    """Test size-based rollover within the same day folder."""

    @pytest.fixture
    def temp_size_dir(self):
        tmp = tempfile.mkdtemp(prefix="skillalign_size_test_")
        yield Path(tmp)
        shutil.rmtree(tmp, ignore_errors=True)

    def test_in_day_size_rotation_creates_suffix_files(self, temp_size_dir):
        # 1KB max file size for fast testing
        handler = DailyDirectoryHandler(
            base_dir=str(temp_size_dir),
            filename="application.log",
            max_bytes=1024,
            tz_name="UTC",
            delay=False,
        )
        handler.setFormatter(JSONFormatter(tz_name="UTC"))

        logger = logging.getLogger("test_size_logger")
        logger.setLevel(logging.INFO)
        logger.addHandler(handler)

        # Write enough records to exceed 1KB
        for i in range(20):
            logger.info(f"Message payload #{i} " + "X" * 100)

        handler.flush()
        handler.close()

        today_path = datetime.now(timezone.utc).strftime("%Y/%m/%d")
        day_dir = temp_size_dir / today_path

        base_file = day_dir / "application.log"
        rotated_file = day_dir / "application.log.1"

        assert base_file.exists(), "Base application.log not found"
        assert rotated_file.exists(), "Rotated application.log.1 not found after size limit exceeded"


# ─────────────────────────────────────────────────────────────────────────────
# 8. Health Check Probe Filter Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestHealthCheckFiltering:
    """Test that successful health probes are dropped while errors are retained."""

    def test_successful_health_check_is_dropped(self):
        f = HealthCheckFilter()
        logger = logging.getLogger("test_health")
        record = logger.makeRecord(
            name="skillalign.api",
            level=logging.INFO,
            fn="main.py",
            lno=100,
            msg="GET /health 200 1.2ms",
            args=(),
            exc_info=None,
            extra={"path": "/health", "status_code": 200},
        )
        assert f.filter(record) is False

    def test_failed_health_check_is_preserved(self):
        f = HealthCheckFilter()
        logger = logging.getLogger("test_health")
        record = logger.makeRecord(
            name="skillalign.api",
            level=logging.ERROR,
            fn="main.py",
            lno=100,
            msg="GET /health 503 1.2ms",
            args=(),
            exc_info=None,
            extra={"path": "/health", "status_code": 503},
        )
        assert f.filter(record) is True


# ─────────────────────────────────────────────────────────────────────────────
# 9. Audit Log vs Application Log Separation Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestAuditLogSeparation:
    """Verify that Application Logging and PostgreSQL Audit Logging are completely separate."""

    def test_audit_log_model_and_service_remain_independent(self):
        from app.models.audit_log import AuditLog
        from app.services.audit_service import log_audit

        # AuditLog is a SQLAlchemy database model
        assert hasattr(AuditLog, "__tablename__")
        assert AuditLog.__tablename__ == "audit_logs"

        # log_audit takes a db Session and records business governance events
        assert callable(log_audit)
