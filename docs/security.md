# TrizenAI Photo Sharing Platform — Security Architecture & Hardening Specification

## 1. Security Architecture Principles
The TrizenAI Photo Sharing Platform enforces strict multi-tenant workspace isolation, server-side role-based access control (RBAC), Object-Level Authorization (IDOR protection), cryptographically safe session handling, and private media storage boundaries.

---

## 2. Core Security Controls Matrix

| Security Layer | Control Description | Verification / Enforcement |
| :--- | :--- | :--- |
| **Authentication** | Django PBKDF2 Password Hashing, Session middleware, Generic login messages. | No custom password storage. Generic "Incorrect email or password." error. |
| **Authorization (RBAC)** | Role validation (`ADMIN` vs `TEAM_MEMBER`) on every protected endpoint. | Client input `role` is ignored. Roles assigned strictly by authorized workspace Admins. |
| **Workspace & IDOR Protection** | Workspace scope filtering on all model queries (`workspace=authorized_workspace`). | Direct URL manipulation (`/events/123/`) returns `404`/`403` if outside user's workspace. |
| **Admin Dashboard Token** | Cryptographically secure URL token (`secrets.token_urlsafe(32)`). | Token required alongside authenticated session + `ADMIN` role + workspace membership. |
| **Gallery PIN Security** | Argon2/PBKDF2 PIN hashing + Rate Limiting (5 attempts/min). | PINs never stored in plaintext. Cooldown applied after 5 failed verification attempts. |
| **Photo Upload Security** | Extension, MIME type, Pillow image parsing, size (15MB), pixel count limits. | Executable files, malformed scripts, SVG/HTML uploads strictly rejected. |
| **Storage Security** | Private Supabase Storage bucket (`event-photos`), short-lived signed URLs. | Service-role credentials remain server-side. Public access prevention enforced. |
| **Rate Limiting** | Sliding window rate limiter for Login, Reset, Resend, PIN verification endpoints. | Returns HTTP `429 Too Many Requests` on threshold breach. |
| **Security Headers** | CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `SameSite=Lax`. | Mitigates XSS, Clickjacking, MIME sniffing, and CSRF attacks. |

---

## 3. Storage Security & Access Model
1. **Private Bucket**: Supabase Storage bucket `event-photos` is created with private access policy.
2. **Signed URLs**: Photographs are served via short-lived signed URLs (`expires_in = 3600` seconds).
3. **No Direct Public Paths**: Permanent public URLs for event photographs are prohibited.
4. **Server-Side Credentials**: `SUPABASE_SERVICE_ROLE_KEY` is loaded from environment variables and never rendered to HTML, JavaScript, or git commits.

---

## 4. Invitation & Password Reset Security
1. **Cryptographic Tokens**: Invitations and password resets use secure token generators (`default_token_generator` or `secrets.token_urlsafe(32)`).
2. **One-Time Expiry**: Reset links and invitation tokens expire after a configurable duration (24h default) and are invalidated immediately upon use.
3. **No Plaintext Passwords**: Passwords are never sent via email or logged in plaintext.

---

## 5. Security Testing Suite
Automated security tests located in `tests/test_e2e_workflow.py` verify:
- Negative authorization boundaries (Team Member accessing Admin actions -> HTTP 403).
- Unassigned event access denial -> HTTP 403 / 404.
- Cross-workspace isolation.
- IDOR resilience against target URL manipulation.
- Account suspension access blocking.
- Unpublished gallery PIN verification protection.
