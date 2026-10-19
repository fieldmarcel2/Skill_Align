# SkillAlign API Documentation

## Overview

SkillAlign is an Enterprise Talent Intelligence & Recruitment Automation Platform.
This documentation covers all REST API endpoints exposed by the SkillAlign backend.

---

## Interactive Documentation (Live Server Required)

Start the backend server first:

```powershell
cd backend
uvicorn main:app --reload
```

Then open:

| URL | Description |
|-----|-------------|
| <http://127.0.0.1:8000/docs> | **Swagger UI** — Interactive API explorer with "Authorize" button |
| <http://127.0.0.1:8000/redoc> | **ReDoc** — Clean, professional reference documentation |
| <http://127.0.0.1:8000/openapi.json> | **OpenAPI Specification** — Machine-readable JSON |

---

## Standalone HTML Documentation (No Server Required)

Open in any browser — no server needed:

```
docs/SkillAlign-API-Documentation.html
```

This file is completely self-contained and can be sent to stakeholders directly.

---

## OpenAPI Specification

```
docs/openapi.json
```

This is the exported OpenAPI 3.1 JSON specification. It is the authoritative machine-readable
description of all API endpoints, schemas, parameters, and responses.

---

## PDF Documentation

To generate a PDF from the standalone HTML:

1. Open `docs/SkillAlign-API-Documentation.html` in **Google Chrome** or **Microsoft Edge**
2. Press `Ctrl+P` (Print)
3. Set **Destination** to "Save as PDF"
4. Set **Margins** to "None" or "Minimum"
5. Enable **Background graphics**
6. Click **Save**
7. Save as `docs/SkillAlign-API-Documentation.pdf`

---

## Regenerating Documentation After API Changes

Whenever you add or modify API endpoints, regenerate the documentation:

### Step 1 — Start the backend

```powershell
cd backend
uvicorn main:app --reload
```

### Step 2 — Export the OpenAPI spec

```powershell
# From the project root
Invoke-WebRequest `
  -Uri "http://127.0.0.1:8000/openapi.json" `
  -OutFile "docs/openapi.json"
```

### Step 3 — Regenerate the standalone HTML

```powershell
npx @redocly/cli build-docs docs/openapi.json -o docs/SkillAlign-API-Documentation.html
```

### Step 4 — Regenerate the PDF

Follow the manual PDF instructions above.

---

## Documentation File Structure

```
SkillAlign/
├── docs/
│   ├── openapi.json                          # OpenAPI 3.1 spec (exported from FastAPI)
│   ├── SkillAlign-API-Documentation.html     # Standalone ReDoc HTML (shareable)
│   ├── SkillAlign-API-Documentation.pdf      # PDF (manual generation via Chrome Print)
│   ├── SkillAlign-API-Overview.md            # High-level API architecture overview
│   └── README.md                             # This file
└── backend/
    └── app/
        ├── main.py                           # FastAPI app + OpenAPI config (source of truth)
        └── routers/                          # All route definitions
```

---

## Authentication

All protected endpoints require a JWT Bearer token.

**To test via Swagger UI:**
1. Call `POST /api/auth/login` with email and password
2. Copy the `access_token` value from the response
3. Click **Authorize 🔒** (top-right in Swagger UI)
4. Paste the token (without "Bearer " prefix)
5. Click **Authorize** and then **Close**

All subsequent requests in that session will include the token.

---

## API Summary

| Metric | Count |
|--------|-------|
| Total unique paths | 114 |
| Total HTTP operations | 137 |
| API tag groups | 18 |
| Roles | 4 (Admin, HR, Recruiter, Candidate) |
