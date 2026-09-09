# TrizenAI Photo Sharing Platform — Operations & Maintenance Runbook

## 1. Executive Summary & Architecture Overview
This document provides operational guidelines, health check semantics, backup procedures, failure recovery runbooks, and performance monitoring standards for the TrizenAI Photo Sharing Platform deployed on Render using Gunicorn and backed by Supabase PostgreSQL & Storage.

---

## 2. Health Monitoring & Observability
### 2.1 Public Health Endpoint
- **URL**: `GET /health/`
- **Expected Status**: `200 OK`
- **Response Payload**:
  ```json
  {
    "status": "ok",
    "database": "ok"
  }
  ```
- **Degraded Status**: Returns `503 Service Unavailable` with `{"status": "error", "database": "error"}` if database ping fails. No internal credentials, stack traces, or server paths are exposed.

### 2.2 Request ID & Log Correlation
Every HTTP request is assigned a unique UUID `X-Request-ID` by `RequestIDMiddleware`.
- **Header**: `X-Request-ID: <uuid4>`
- **Log Logged Context**: Timestamp, Request ID, Method, Path, Remote IP, Status Code, Elapsed Time.
- **Traceability**: Search application logs using `req_<uuid>` to correlate view handlers, database queries, and storage operations.

---

## 3. Deployment & Gunicorn Configuration
### 3.1 Render / Production Start Command
```bash
gunicorn config.wsgi:application \
    --workers 4 \
    --threads 2 \
    --timeout 30 \
    --graceful-timeout 30 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile -
```

### 3.2 Key Worker & Resource Limits
- `MAX_UPLOAD_SIZE_MB` (Default: 15 MB)
- `MAX_FILES_PER_UPLOAD` (Default: 50)
- `MAX_PAGE_SIZE` (Default: 100)
- `PIN_MAX_ATTEMPTS` (Default: 5)
- `PIN_LOCKOUT_SECONDS` (Default: 60)
- `SIGNED_URL_EXPIRY_SECONDS` (Default: 3600)
- `REQUEST_TIMEOUT_SECONDS` (Default: 30)

---

## 4. Incident Response & Troubleshooting Runbooks

### 4.1 High Rate of 429 Errors (Rate Limit Exceeded)
1. Filter logs for `429 Too Many Requests`.
2. Inspect IP address and user account triggering request surges.
3. If legitimate traffic spike, adjust `RATELIMIT_LOGIN` / `RATELIMIT_PIN` limits in `.env`.
4. If brute-force attempt, verify lockout status in cache and ensure zero account leakage occurred.

### 4.2 High Rate of 500 Errors
1. Extract `X-Request-ID` from log or client bug report.
2. Search server logs for the matching correlation ID to locate the exact unhandled exception traceback.
3. Verify if issue stems from Supabase PostgreSQL connection exhaustion or Supabase Storage timeout.
4. Verify custom 500 error page was rendered to user without exposing internal tracebacks.

### 4.3 Supabase Storage Outage / Upload Failures
1. Check `GET /health/`. If DB is fine, check Supabase project status dashboard.
2. Verify application storage fallback: system catches `StorageApiError` / timeouts gracefully, displays friendly error message `"Photo storage is temporarily unavailable. Please try again."`, and rolls back uncommitted DB records.
3. Once Supabase Storage restores, retry failed uploads from client dashboard.

---

## 5. Database Backups & Recovery
- **Database Engine**: Supabase Managed PostgreSQL.
- **Point-In-Time Recovery (PITR)**: Managed automatically by Supabase. Daily snapshots retain 7 to 30 days depending on plan tier.
- **Schema Management**: All database schemas and migrations are strictly tracked in Git (`apps/*/migrations/` and `supabase_schema.sql`).
- **Disaster Recovery Strategy**:
  1. Stand up new Supabase PostgreSQL instance.
  2. Apply SQL schema (`python manage.py migrate`).
  3. Restore point-in-time database backup via Supabase CLI or management console.
  4. Point `DATABASE_URL` environment variable to new connection string and restart Gunicorn.

---

## 6. Pre-Flight Production Deployment Checklist
Run the following verification commands prior to every production release:
```bash
python manage.py check --deploy
python manage.py check
python manage.py test
```
