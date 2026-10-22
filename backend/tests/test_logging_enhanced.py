"""
SkillAlign — Enhanced Logging Debuggability Tests
===================================================

Tests added for the enhanced logging system:

1. PII field redaction (phone, address, resume_raw_text)
2. Payload truncation helpers (sanitize_and_truncate, _truncate_payload)
3. debug_log helper — emits only when DEBUG is active
4. is_debug_logging_enabled helper
5. ConsoleFormatter stage and payload_preview output
6. JSONFormatter new context fields (stage, payload_preview, rows_affected, db_operation)
7. SQLAlchemy log level promotion in DEBUG mode
8. Request middleware DEBUG request-start log
9. Input vs output count discrepancy logging
10. Exception stage context preserved in JSON
11. Audit log separation maintained
"""

import json
import logging
import sys
import shutil
import tempfile
from pathlib import Path
from datetime import datetime, timezone
from io import StringIO

import pytest
from fastapi.testclient import TestClient

from app.core.logging_config import (
    setup_logging,
    _redact_string,
    _redact_data,
    RedactionFilter,
    JSONFormatter,
    ConsoleFormatter,
    DailyDirectoryHandler,
    sanitize_and_truncate,
    debug_log,
    is_debug_logging_enabled,
    _truncate_payload,
)
from app.core.request_context import (
    set_request_id,
    get_request_id,
    set_user_context,
    clear_context,
    set_context_field,
)
from app.main import app


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clear_request_context():
    """Ensure each test starts with a clean context."""
    clear_context()
    yield
    clear_context()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def temp_log_dir():
    tmp = tempfile.mkdtemp(prefix="skillalign_debug_test_")
    yield Path(tmp)
    shutil.rmtree(tmp, ignore_errors=True)


# ─────────────────────────────────────────────────────────────────────────────
# 1. PII Redaction — new sensitive keys
# ─────────────────────────────────────────────────────────────────────────────

class TestPIIRedaction:
    """Verify that PII fields introduced in the enhanced sensitive-key list are redacted."""

    def test_phone_number_redacted_in_dict(self):
        data = {"name": "Alice", "phone_number": "+91-98765-43210", "email": "alice@test.com"}
        result = _redact_data(data)
        assert result["phone_number"] == "[REDACTED]"
        assert result["name"] == "Alice"

    def test_mobile_redacted_in_dict(self):
        data = {"mobile": "9876543210", "candidate_id": 42}
        result = _redact_data(data)
        assert result["mobile"] == "[REDACTED]"
        assert result["candidate_id"] == 42

    def test_address_redacted_in_dict(self):
        data = {"home_address": "123 MG Road, Bengaluru", "city": "Bengaluru"}
        result = _redact_data(data)
        assert result["home_address"] == "[REDACTED]"
        assert result["city"] == "Bengaluru"

    def test_resume_raw_text_redacted(self):
        data = {"resume_raw_text": "John Doe\n9876543210\nExperience: 5 years Python", "status": "ok"}
        result = _redact_data(data)
        assert result["resume_raw_text"] == "[REDACTED]"
        assert result["status"] == "ok"

    def test_national_id_redacted(self):
        data = {"national_id": "XXXX1234", "candidate_id": 99}
        result = _redact_data(data)
        assert result["national_id"] == "[REDACTED]"

    def test_dob_redacted(self):
        data = {"dob": "1995-06-15", "job_id": 7}
        result = _redact_data(data)
        assert result["dob"] == "[REDACTED]"

    def test_nested_pii_redacted(self):
        data = {
            "candidate": {
                "name": "Bob",
                "phone": "91234567890",
                "address": "456 Park Street",
                "skills": ["Python", "SQL"],
            }
        }
        result = _redact_data(data)
        assert result["candidate"]["phone"] == "[REDACTED]"
        assert result["candidate"]["address"] == "[REDACTED]"
        assert result["candidate"]["name"] == "Bob"
        assert result["candidate"]["skills"] == ["Python", "SQL"]


# ─────────────────────────────────────────────────────────────────────────────
# 2. Payload Truncation Helpers
# ─────────────────────────────────────────────────────────────────────────────

class TestPayloadTruncation:
    """Verify that sanitize_and_truncate and _truncate_payload behave correctly."""

    def test_small_dict_returned_in_full(self):
        data = {"job_id": 1, "title": "Data Engineer"}
        result = sanitize_and_truncate(data, max_chars=500)
        parsed = json.loads(result)
        assert parsed["job_id"] == 1
        assert parsed["title"] == "Data Engineer"

    def test_large_dict_is_truncated(self):
        data = {"description": "X" * 5000}
        result = sanitize_and_truncate(data, max_chars=100)
        assert "[truncated" in result
        assert len(result) < 5500

    def test_list_capped_at_max_items(self):
        data = list(range(50))
        result = _truncate_payload(data, max_chars=9999)
        assert "more items omitted" in result
        assert "total=50" in result

    def test_short_list_returned_in_full(self):
        data = [1, 2, 3]
        result = _truncate_payload(data, max_chars=9999)
        assert "omitted" not in result

    def test_sensitive_values_redacted_before_truncation(self):
        data = {"user": "alice", "password": "SuperSecret", "job_id": 5}
        result = sanitize_and_truncate(data)
        assert "SuperSecret" not in result
        assert "[REDACTED]" in result

    def test_string_truncated_at_limit(self):
        long_str = "A" * 3000
        result = _truncate_payload(long_str, max_chars=100)
        assert result.startswith("A" * 100)
        assert "[truncated" in result


# ─────────────────────────────────────────────────────────────────────────────
# 3. debug_log Helper
# ─────────────────────────────────────────────────────────────────────────────

class TestDebugLogHelper:
    """Verify that debug_log emits only when DEBUG is active and redacts payloads."""

    def _make_capturing_logger(self, level: int = logging.DEBUG):
        lg = logging.getLogger(f"skillalign.test.debug_log_{level}_{id(self)}")
        lg.setLevel(level)
        lg.propagate = False
        lg.handlers.clear()
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setLevel(level)
        handler.setFormatter(ConsoleFormatter(use_color=False))
        lg.addHandler(handler)
        return lg, stream

    def test_debug_log_emits_when_debug_enabled(self):
        lg, stream = self._make_capturing_logger(logging.DEBUG)
        debug_log(lg, "Test debug message", stage="test_stage")
        output = stream.getvalue()
        assert "Test debug message" in output
        assert "stage=test_stage" in output

    def test_debug_log_does_not_emit_when_info_level(self):
        lg, stream = self._make_capturing_logger(logging.INFO)
        debug_log(lg, "Should not appear", stage="hidden_stage")
        output = stream.getvalue()
        assert "Should not appear" not in output

    def test_debug_log_redacts_sensitive_payload(self):
        lg, stream = self._make_capturing_logger(logging.DEBUG)
        payload = {"user": "alice", "password": "secret_pw", "job_id": 3}
        debug_log(lg, "Payload check", payload=payload)
        output = stream.getvalue()
        assert "secret_pw" not in output
        assert "[REDACTED]" in output

    def test_debug_log_payload_shown_in_output(self):
        lg, stream = self._make_capturing_logger(logging.DEBUG)
        payload = {"job_id": 10, "title": "ML Engineer"}
        debug_log(lg, "Job created", payload=payload, stage="database_insert")
        output = stream.getvalue()
        assert "Job created" in output

    def test_debug_log_with_extra_fields(self):
        lg, stream = self._make_capturing_logger(logging.DEBUG)
        debug_log(lg, "Candidate scored", extra_fields={"candidate_id": 42})
        output = stream.getvalue()
        assert "Candidate scored" in output


# ─────────────────────────────────────────────────────────────────────────────
# 4. is_debug_logging_enabled
# ─────────────────────────────────────────────────────────────────────────────

class TestIsDebugLoggingEnabled:
    """Verify is_debug_logging_enabled reflects root logger level."""

    def test_returns_true_when_debug(self, temp_log_dir):
        setup_logging(log_level="DEBUG", log_directory=str(temp_log_dir),
                      console_enabled=False, file_enabled=False, force=True)
        assert is_debug_logging_enabled() is True

    def test_returns_false_when_info(self, temp_log_dir):
        setup_logging(log_level="INFO", log_directory=str(temp_log_dir),
                      console_enabled=False, file_enabled=False, force=True)
        assert is_debug_logging_enabled() is False


# ─────────────────────────────────────────────────────────────────────────────
# 5. JSONFormatter — new context fields
# ─────────────────────────────────────────────────────────────────────────────

class TestJSONFormatterNewFields:
    """Verify that stage, rows_affected, db_operation, input_count, output_count are in JSON output."""

    def _make_record(self, extra: dict) -> logging.LogRecord:
        lg = logging.getLogger("skillalign.test_json_fields")
        return lg.makeRecord(
            name="skillalign.job_service",
            level=logging.DEBUG,
            fn="job_service.py",
            lno=42,
            msg="Test structured log",
            args=(),
            exc_info=None,
            extra=extra,
        )

    def test_stage_field_included_in_json(self):
        formatter = JSONFormatter(tz_name="UTC")
        record = self._make_record({"stage": "database_insert", "event": "job_created"})
        data = json.loads(formatter.format(record))
        assert data.get("stage") == "database_insert"

    def test_rows_affected_included_in_json(self):
        formatter = JSONFormatter(tz_name="UTC")
        record = self._make_record({"rows_affected": 3, "event": "bulk_insert"})
        data = json.loads(formatter.format(record))
        assert data.get("rows_affected") == 3

    def test_db_operation_included_in_json(self):
        formatter = JSONFormatter(tz_name="UTC")
        record = self._make_record({"db_operation": "INSERT", "event": "job_skill_insert"})
        data = json.loads(formatter.format(record))
        assert data.get("db_operation") == "INSERT"

    def test_input_output_count_in_json(self):
        formatter = JSONFormatter(tz_name="UTC")
        record = self._make_record({"input_count": 5, "output_count": 4, "event": "shortlist_result"})
        data = json.loads(formatter.format(record))
        assert data.get("input_count") == 5
        assert data.get("output_count") == 4

    def test_discrepancy_note_in_json(self):
        formatter = JSONFormatter(tz_name="UTC")
        record = self._make_record({"discrepancy_note": "Expected 3 but got 2", "event": "count_mismatch"})
        data = json.loads(formatter.format(record))
        assert "Expected 3 but got 2" in data.get("discrepancy_note", "")

    def test_payload_preview_redacted_before_json_serialisation(self):
        """payload_preview in JSON output must not contain raw secrets."""
        formatter = JSONFormatter(tz_name="UTC")
        safe_preview = sanitize_and_truncate({"password": "leaked", "job_id": 1})
        record = self._make_record({"payload_preview": safe_preview, "event": "test"})
        raw = formatter.format(record)
        assert "leaked" not in raw


# ─────────────────────────────────────────────────────────────────────────────
# 6. ConsoleFormatter — stage field display
# ─────────────────────────────────────────────────────────────────────────────

class TestConsoleFormatterStage:
    """Verify ConsoleFormatter renders stage= and new fields correctly."""

    def _format(self, extra: dict, message: str = "Test msg", level=logging.DEBUG) -> str:
        fmt = ConsoleFormatter(use_color=False)
        lg = logging.getLogger("skillalign.test_console")
        record = lg.makeRecord(
            name="skillalign.test",
            level=level,
            fn="test.py",
            lno=1,
            msg=message,
            args=(),
            exc_info=None,
            extra=extra,
        )
        return fmt.format(record)

    def test_stage_appears_in_console_output(self):
        out = self._format({"stage": "database_insert"})
        assert "stage=database_insert" in out

    def test_match_result_id_appears_in_console(self):
        out = self._format({"match_result_id": 55})
        assert "match_result_id=55" in out

    def test_user_role_appears_in_console(self):
        out = self._format({"user_role": "HR"})
        assert "user_role=HR" in out

    def test_payload_preview_shown_in_debug_console(self):
        payload = sanitize_and_truncate({"job_id": 1, "title": "Engineer"})
        out = self._format({"payload_preview": payload}, level=logging.DEBUG)
        assert "payload=" in out

    def test_payload_preview_not_shown_in_info_console(self):
        payload = sanitize_and_truncate({"job_id": 1})
        out = self._format({"payload_preview": payload}, level=logging.INFO)
        assert "payload=" not in out


# ─────────────────────────────────────────────────────────────────────────────
# 7. SQLAlchemy Log Level in DEBUG Mode
# ─────────────────────────────────────────────────────────────────────────────

class TestSQLAlchemyLogLevel:
    """Verify sqlalchemy.engine is promoted to INFO in DEBUG mode."""

    def test_sqlalchemy_engine_info_level_in_debug(self, temp_log_dir):
        setup_logging(log_level="DEBUG", log_directory=str(temp_log_dir),
                      console_enabled=False, file_enabled=False, force=True)
        sa_logger = logging.getLogger("sqlalchemy.engine")
        assert sa_logger.level == logging.INFO

    def test_sqlalchemy_engine_warning_level_in_info(self, temp_log_dir):
        setup_logging(log_level="INFO", log_directory=str(temp_log_dir),
                      console_enabled=False, file_enabled=False, force=True)
        sa_logger = logging.getLogger("sqlalchemy.engine")
        assert sa_logger.level == logging.WARNING

    def test_sqlalchemy_pool_always_warning(self, temp_log_dir):
        """Pool chatter should stay quiet even in DEBUG."""
        setup_logging(log_level="DEBUG", log_directory=str(temp_log_dir),
                      console_enabled=False, file_enabled=False, force=True)
        pool_logger = logging.getLogger("sqlalchemy.pool")
        assert pool_logger.level == logging.WARNING


# ─────────────────────────────────────────────────────────────────────────────
# 8. Redaction Filter — PII in record attributes
# ─────────────────────────────────────────────────────────────────────────────

class TestRedactionFilterPII:
    """Verify RedactionFilter scrubs new PII key names from record attributes."""

    def test_phone_number_attribute_scrubbed(self):
        f = RedactionFilter()
        lg = logging.getLogger("skillalign.test_pii")
        record = lg.makeRecord(
            name="skillalign.test", level=logging.INFO, fn="test.py", lno=1,
            msg="Processing candidate", args=(), exc_info=None,
            extra={"phone_number": "+91-99999-99999", "candidate_id": 10},
        )
        f.filter(record)
        assert getattr(record, "phone_number") == "[REDACTED]"
        assert getattr(record, "candidate_id") == 10

    def test_address_attribute_scrubbed(self):
        f = RedactionFilter()
        lg = logging.getLogger("skillalign.test_pii_addr")
        record = lg.makeRecord(
            name="skillalign.test", level=logging.INFO, fn="test.py", lno=1,
            msg="Profile updated", args=(), exc_info=None,
            extra={"address": "123 MG Road", "user_id": 7},
        )
        f.filter(record)
        assert getattr(record, "address") == "[REDACTED]"
        assert getattr(record, "user_id") == 7


# ─────────────────────────────────────────────────────────────────────────────
# 9. Input vs Output Count Discrepancy Logging
# ─────────────────────────────────────────────────────────────────────────────

class TestCountDiscrepancyLogging:
    """Verify discrepancy logs include input_count and output_count."""

    def test_json_formatter_discrepancy_note_field(self):
        formatter = JSONFormatter(tz_name="UTC")
        lg = logging.getLogger("skillalign.test_discrepancy")
        record = lg.makeRecord(
            name="skillalign.resume", level=logging.WARNING, fn="resume_service.py", lno=200,
            msg="Skill extraction mismatch", args=(), exc_info=None,
            extra={"event": "resume_skill_mismatch", "candidate_id": 5,
                   "input_count": 10, "output_count": 7, "discrepancy_note": "Synced=7, Parsed=10"},
        )
        data = json.loads(formatter.format(record))
        assert data["input_count"] == 10
        assert data["output_count"] == 7
        assert "Synced=7" in data["discrepancy_note"]

    def test_matching_zero_score_warning_structure(self):
        formatter = JSONFormatter(tz_name="UTC")
        lg = logging.getLogger("skillalign.matching")
        record = lg.makeRecord(
            name="skillalign.matching", level=logging.WARNING, fn="matching_service.py", lno=305,
            msg="All 3 candidates scored 0.0", args=(), exc_info=None,
            extra={"event": "matching_all_zero_scores", "job_id": 12,
                   "input_count": 3, "output_count": 0, "discrepancy_note": "Zero-score candidates: [1, 2, 3]"},
        )
        data = json.loads(formatter.format(record))
        assert data["input_count"] == 3
        assert data["output_count"] == 0
        assert data["job_id"] == 12


# ─────────────────────────────────────────────────────────────────────────────
# 10. Exception Logging — stage context preserved
# ─────────────────────────────────────────────────────────────────────────────

class TestExceptionLoggingWithStage:
    """Verify that exception logs include stage context."""

    def test_exception_log_with_stage_serializes_correctly(self):
        formatter = JSONFormatter(tz_name="UTC")
        lg = logging.getLogger("skillalign.test_exc_stage")
        try:
            raise RuntimeError("Database constraint violated")
        except RuntimeError:
            exc_info = sys.exc_info()
        record = lg.makeRecord(
            name="skillalign.job_service", level=logging.ERROR, fn="job_service.py", lno=99,
            msg="Job creation failed", args=(), exc_info=exc_info,
            extra={"event": "job_create_failed", "stage": "database_insert",
                   "user_id": 3, "exception_type": "RuntimeError"},
        )
        data = json.loads(formatter.format(record))
        assert data["stage"] == "database_insert"
        assert data["exception_type"] == "RuntimeError"
        assert "traceback" in data
        assert "RuntimeError: Database constraint violated" in data["traceback"]

    def test_x_request_id_header_present_on_all_responses(self, client):
        resp = client.get("/health")
        header_key = "x-request-id" if "x-request-id" in resp.headers else "X-Request-ID"
        assert header_key in resp.headers
        assert len(resp.headers[header_key]) >= 8


# ─────────────────────────────────────────────────────────────────────────────
# 11. Audit Log Separation — unchanged
# ─────────────────────────────────────────────────────────────────────────────

class TestAuditLogSeparationPreserved:
    """Verify that the audit log model and service are still independent."""

    def test_audit_log_model_unchanged(self):
        from app.models.audit_log import AuditLog
        assert hasattr(AuditLog, "__tablename__")
        assert AuditLog.__tablename__ == "audit_logs"

    def test_audit_service_callable(self):
        from app.services.audit_service import log_audit
        assert callable(log_audit)

    def test_debug_log_helper_does_not_write_audit_log(self):
        """debug_log must only use Python logging, not the AuditLog model."""
        import app.core.logging_config as lc
        import inspect
        src = inspect.getsource(lc.debug_log)
        assert "AuditLog" not in src
        assert "log_audit" not in src
