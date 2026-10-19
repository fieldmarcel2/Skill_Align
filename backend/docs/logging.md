# SkillAlign — Production-Grade Application Logging System

## 1. Executive Summary & Logging Architecture

SkillAlign implements a centralized, production-grade application logging system designed for enterprise observability, high-precision debugging, security compliance, and historical auditability.

The logging system is built entirely upon Python's standard `logging` library and FastAPI middleware, operating with zero external telemetry lock-in while remaining 100% forward-compatible with centralized log aggregators such as **Grafana Loki**, **Elasticsearch/Kibana (ELK)**, **OpenSearch**, and **AWS CloudWatch Logs**.

### End-to-End Log Flow Architecture

```text
                                 HTTP REQUEST
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │    RequestIDMiddleware    │
                        │  (Extracts / generates ID │
                        │   and starts timer)       │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │   Authentication & RBAC   │
                        │  (Attaches user_id & role │
                        │   to request context)     │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │   FastAPI API Endpoints   │
                        │  (Routers: jobs, matching,│
                        │   resume, workflow, etc.) │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │       Service Layer       │
                        │  (Matching, Resume Parser,│
                        │   S3, Email, SMS, DB)     │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │    Python Standard Logger │
                        │     logging.getLogger()   │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │     Redaction Filter      │
                        │ (Sanitizes passwords, JWT,│
                        │  tokens, OTPs, DB URLs)   │
                        └───────┬───────────┬───────┘
                                │           │
                ┌───────────────┘           └───────────────┐
                ▼                                           ▼
   ┌───────────────────────────┐             ┌───────────────────────────┐
   │     Console Handler       │             │   DailyDirectoryHandler   │
   │   (Colorized Terminal)    │             │  (Structured JSON Lines)  │
   └───────────────────────────┘             └─────────────┬─────────────┘
                                                           │
                                                           ▼
                                            ┌─────────────────────────────┐
                                            │      logs/YYYY/MM/DD/       │
                                            ├─────────────────────────────┤
                                            │ ├── application.log         │
                                            │ ├── error.log               │
                                            │ ├── warning.log             │
                                            │ ├── access.log              │
                                            │ └── security.log            │
                                            └─────────────┬───────────────┘
                                                          │
                                                          ▼
                                            ┌─────────────────────────────┐
                                            │ Future Ingestion (Optional) │
                                            │ Loki / ELK / CloudWatch     │
                                            └─────────────────────────────┘
```

---

## 2. Application Logs vs. Audit Logs

SkillAlign maintains a strict boundary between **Application Logs** and **Audit Logs**. They serve entirely different purposes and operate on different storage tiers.

| Dimension | Application Logs | Audit Logs (`audit_logs` table) |
|---|---|---|
| **Core Question** | **WHAT** happened technically? **WHY** did it fail? **HOW** long did it take? | **WHO** performed **WHAT** business action and **WHEN**? |
| **Examples** | S3 upload failure, slow API request (1420ms), unhandled exception, matching algorithm execution | Recruiter shortlisted candidate, HR approved candidate, Offer sent, Candidate accepted offer |
| **Target Audience** | Backend Engineers, DevOps, Site Reliability Engineers | HR Managers, Compliance Officers, Legal Auditors |
| **Storage Backend** | Structured JSON files in `logs/YYYY/MM/DD/` + stdout | PostgreSQL database table `audit_logs` |
| **Retention Policy** | Configurable time-based rotation (e.g., 30 days) | Long-term permanent business record |
| **PII / Data Scope** | Strictly technical IDs (`candidate_id`, `job_id`); secrets and raw content redacted | Business metadata snapshots (e.g., candidate name, state change) |

> **Rule:** Never write purely technical debugging traces to the PostgreSQL `audit_logs` table, and never replace the business audit log service with file logging.

---

## 3. Terminal Logging (Development Mode)

During development and runtime, logs are formatted with ANSI color codes and printed to standard error for real-time visibility without cluttering standard stdout.

### Terminal Output Format
```text
YYYY-MM-DD HH:MM:SS | LEVEL    | logger.name | req=REQUEST_ID | [context_fields] | Message
```

### Color Codes by Level
- **DEBUG**: Cyan
- **INFO**: Green
- **WARNING**: Yellow
- **ERROR**: Red
- **CRITICAL**: Magenta

### Terminal Examples
```text
2026-10-07 09:42:18 | INFO     | skillalign.api | req=req_8f7d9c21 | duration_ms=142.50 | POST /api/jobs 201 142.50ms
2026-10-07 09:43:10 | INFO     | skillalign.matching | req=req_3a2b1c0d | job_id=17 | Matching completed for job 17: 6 matches in 428.50ms
2026-10-07 09:44:21 | ERROR    | skillalign.resume | req=req_7e8f9a0b | candidate_id=92 | Resume parsing failed for candidate 92: ParserError
```

---

## 4. Persistent Log Storage & Directory Structure

Logs are persistently written to disk under a calendar-day directory hierarchy partitioned by **Year**, **Month**, and **Day**:

```text
logs/
└── 2026/
    └── 10/
        ├── 04/
        │   ├── application.log
        │   ├── error.log
        │   ├── warning.log
        │   ├── access.log
        │   └── security.log
        ├── 05/
        │   ├── application.log
        │   ├── error.log
        │   ├── warning.log
        │   ├── access.log
        │   └── security.log
        ├── 06/
        │   ├── application.log
        │   ├── error.log
        │   ├── warning.log
        │   ├── access.log
        │   └── security.log
        └── 07/
            ├── application.log
            ├── error.log
            ├── warning.log
            ├── access.log
            └── security.log
```

---

## 5. Log File Categories

Each calendar day directory contains 5 dedicated log files separated by event type and severity:

### 1. `application.log`
Contains all standard application lifecycle, domain workflow, and operational records at `INFO` level and above, excluding access and security events.
- **Events**: `logging_initialized`, `job_created`, `matching_started`, `matching_completed`, `resume_upload_started`, `resume_upload_completed`, `resume_parsing_started`, `resume_parsing_completed`, `s3_upload`, `notification_dispatched`.

### 2. `error.log`
Dedicated strictly to `ERROR` and `CRITICAL` events across all modules.
- **Events**: `unhandled_exception`, `database_error`, `matching_failed`, `resume_parsing_failed`, `s3_upload_failed`, `email_delivery_failed`.
- **Content**: Includes the `exception_type` and full Python `traceback`.

### 3. `warning.log`
Contains all `WARNING` level records for unexpected but recoverable conditions.
- **Events**: `slow_request`, `login_failed`, `permission_denied`, `stream_extraction_fallback`.

### 4. `access.log`
Contains HTTP request and response telemetry emitted by `RequestIDMiddleware`.
- **Events**: `http_request`.
- **Fields**: `method`, `path`, `status_code`, `duration_ms`, `request_id`, `client_ip`, `user_id`, `user_role`.
- **Note**: Successful 2xx health check probes (`/health`, `/healthz`, `/ready`, `/ping`) are automatically dropped to prevent log bloat.

### 5. `security.log`
Contains authentication, token lifecycle, and authorization security events.
- **Events**: `login_success`, `login_failed`, `token_revoked`, `token_invalid`, `token_validation_failed`, `permission_denied`, `otp_sent`, `otp_login_success`, `otp_verification_failed`, `password_reset_requested`, `password_reset_success`.

---

## 6. Structured JSON Format

Every record written to the persistent log files is formatted as a single, valid JSON line (`.jsonl`).

### Schema Definition

```json
{
  "timestamp": "2026-10-07T09:42:18.321456+05:30",
  "level": "INFO",
  "logger": "skillalign.api",
  "event": "http_request",
  "message": "POST /api/jobs 201 142.50ms",
  "request_id": "req_8f7d9c21",
  "user_id": 42,
  "user_role": "HR",
  "method": "POST",
  "path": "/api/jobs",
  "status_code": 201,
  "duration_ms": 142.5,
  "client_ip": "127.0.0.1"
}
```

### Key JSON Fields Reference

| Field | Type | Description |
|---|---|---|
| `timestamp` | string (ISO-8601) | Timestamp with configured timezone offset (e.g. `+05:30`) |
| `level` | string | Log level: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| `logger` | string | Hierarchical logger name (e.g. `skillalign.matching`, `skillalign.auth`) |
| `event` | string | Machine-readable snake_case event identifier |
| `message` | string | Human-readable log summary |
| `request_id` | string | Unique 8-character hex or propagated correlation ID |
| `user_id` | integer (optional) | Authenticated user ID |
| `user_role` | string (optional) | Authenticated user role (`Admin`, `HR`, `Recruiter`, `Candidate`) |
| `candidate_id` | integer (optional) | Associated candidate ID |
| `job_id` | integer (optional) | Associated job requisition ID |
| `match_id` | integer (optional) | Associated match result ID |
| `duration_ms` | float (optional) | Elapsed execution duration in milliseconds |
| `exception_type` | string (optional) | Class name of the caught exception |
| `traceback` | string (optional) | Full multiline stack trace |

---

## 7. Request ID & Correlation System

1. **Generation & Extraction**:
   - When a client sends the `X-Request-ID` header, `RequestIDMiddleware` validates it against `^[a-zA-Z0-9\-_]{1,128}$`. Safe headers are reused for distributed tracing.
   - If missing or invalid, an 8-character random hex ID is generated using `uuid.uuid4().hex[:8]`.
2. **Async ContextVar Storage**:
   - The request ID is stored in `app.core.request_context._request_id_var` (an async-safe `contextvars.ContextVar`).
   - Any service, repository, or background function can call `get_request_id()` without passing request objects down the call stack.
3. **Response Headers**:
   - The API response always returns:
     - `X-Request-ID: <id>`
     - `X-Response-Time: <duration_ms>ms`
4. **Automatic Log Injection**:
   - The `JSONFormatter` and `ConsoleFormatter` automatically inject the request ID into every log record generated during that request context.

---

## 8. Sensitive Data Redaction & Security

SkillAlign applies centralized, automated redaction to ensure credentials, tokens, and PII are never persisted in logs or displayed in terminal output.

### Redacted Keys & Keywords
The `RedactionFilter` and `_redact_data()` engine automatically replace values associated with the following keys with `[REDACTED]`:
- `password`, `password_hash`, `passwd`, `pwd`
- `authorization`, `access_token`, `refresh_token`, `jwt`, `token`
- `otp`, `slot_token`, `offer_token`, `password_reset_token`
- `api_key`, `secret_key`, `client_secret`
- `aws_access_key_id`, `aws_secret_access_key`
- `database_url`, `db_url` (PostgreSQL passwords in URLs are stripped to `postgresql://user:[REDACTED]@host:port/db`)
- `cookie`, `set-cookie`, `session`
- `sendgrid_api_key`, `twilio_auth_token`, `gemini_api_key`

### PII Protection Guidelines
- **Candidate Resumes**: Full resume text and raw binary bytes are NEVER logged. Only metadata (`candidate_id`, `s3_key`, `file_type`, `skills_count`) is recorded.
- **Passwords & OTPs**: Plaintext passwords and OTP verification codes are never logged in production.

---

## 9. 24-Hour Daily Rollover & Size Protection

### Calendar Day Rotation
The `DailyDirectoryHandler` checks the current date using the configured application timezone (`LOG_TIMEZONE`, default `Asia/Kolkata`).
- At **00:00:00**, the handler automatically rotates to the new date directory: `logs/YYYY/MM/DD/`.
- File descriptors from the previous day are cleanly flushed and closed.

### File Size Limit Protection
To prevent any single log file from growing unboundedly on high-traffic days:
- If a file exceeds `LOG_MAX_FILE_SIZE_MB` (default `50MB`), it is automatically rotated within that same day's folder to:
  - `application.log.1`
  - `application.log.2`
  - etc.
- The active log writer continues writing to `application.log`.

---

## 10. Automated Retention Cleanup

Historical log directories are retained for a configurable number of days (`LOG_RETENTION_DAYS`, default `30`).
- During startup and at every daily midnight rollover, `_cleanup_old_logs()` scans `logs/`.
- Directories older than `now - timedelta(days=LOG_RETENTION_DAYS)` are safely removed.
- Empty parent month/year directories are pruned automatically.

---

## 11. Configuration Reference

All logging parameters are configured through environment variables or the `.env` file via `app.core.config.Settings`:

| Environment Variable | Default Value | Description |
|---|---|---|
| `LOG_LEVEL` | `INFO` | Root logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`) |
| `LOG_DIRECTORY` | `logs` | Relative or absolute path for persistent log storage |
| `LOG_TIMEZONE` | `Asia/Kolkata` | IANA timezone name for calendar day directories & timestamps |
| `LOG_CONSOLE_ENABLED` | `true` | Enable colorized terminal output to stderr |
| `LOG_FILE_ENABLED` | `true` | Enable persistent JSON daily directory log storage |
| `LOG_RETENTION_DAYS` | `30` | Number of calendar days to retain historical log folders |
| `LOG_MAX_FILE_SIZE_MB` | `50` | Maximum file size in megabytes before in-day rotation |
| `LOG_SLOW_REQUEST_THRESHOLD_MS` | `1000` | HTTP response duration threshold (ms) triggering a slow-request warning |

---

## 12. How to Find a Log from 3 Days Ago (Incident Investigation)

### Scenario
An HR manager reports that an error occurred 3 days ago (**October 4, 2026**), or provides a Request ID: `req_8f7d9c21`.

### Step 1: Navigate to the Date Directory
Because SkillAlign uses strict `YEAR/MONTH/DAY` partitioning, navigate directly to:
```bash
cd logs/2026/10/04/
```

### Step 2: Check for Errors
To view all unhandled exceptions and server errors that occurred on October 4:
```bash
# View all errors with stack traces
cat error.log

# Or search using jq for clean formatting
cat error.log | jq '{timestamp, event, message, request_id, exception_type}'
```

### Step 3: Trace by Request ID
To reconstruct the entire request lifecycle across all files for request `req_8f7d9c21`:
```bash
# Search across all log files in that day's folder
grep -rn "req_8f7d9c21" .
```
This will reveal:
1. `access.log`: HTTP method, path, response status, duration.
2. `application.log`: Business operations triggered (e.g. matching started, S3 upload).
3. `error.log`: Exact exception traceback and root cause if it failed.

### Step 4: Search by Candidate ID, Job ID, or Match ID
```bash
# Find all matching engine actions for Candidate #92
grep '"candidate_id": 92' application.log

# Find all events for Job #17
grep '"job_id": 17' application.log

# Find all slow requests (> 1000ms) on that day
grep '"event": "slow_request"' warning.log
```

---

## 13. Common Historical Search Commands (Cheat Sheet)

| Task | Command |
|---|---|
| **Find all 500 errors today** | `cat logs/$(date +%Y/%m/%d)/error.log \| jq .` |
| **Search by Request ID** | `grep -r "req_abc123" logs/2026/10/` |
| **Find authentication failures** | `cat logs/2026/10/07/security.log \| grep "login_failed"` |
| **Find slow requests (>1s)** | `cat logs/2026/10/07/warning.log \| grep "slow_request"` |
| **Find matching runs for Job #15** | `grep '"job_id": 15' logs/2026/10/07/application.log` |
| **Find resume parsing errors** | `grep '"event": "resume_parsing_failed"' logs/2026/10/07/error.log` |
| **Count HTTP requests by status code** | `cat logs/2026/10/07/access.log \| jq .status_code \| sort \| uniq -c` |

---

## 14. Future Centralized Ingestion (Loki / ELK / CloudWatch)

Because SkillAlign outputs standard JSON Lines with uniform fields, log shippers (such as Promtail for Loki, Filebeat for ELK, or FluentBit for CloudWatch) can ingest the log stream with zero modification:

### Promtail / Grafana Loki Configuration Snippet
```yaml
scrape_configs:
  - job_name: skillalign
    static_configs:
      - targets: [localhost]
        labels:
          job: skillalign-api
          __path__: /path/to/skillalign/backend/logs/*/*/*/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            logger: logger
            event: event
            request_id: request_id
      - labels:
          level:
          logger:
          event:
```
