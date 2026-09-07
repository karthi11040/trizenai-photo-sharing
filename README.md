# TrizenAI Photo Sharing Platform

A full-stack, production-quality photo sharing platform built for photography and event teams. Allows photography leads to coordinate events, assign team members, review and curate uploaded event photos, and publish PIN-protected customer galleries accessible via a shareable link without requiring an account.

---

## Architecture Diagram

```text
                     Browser (Customer / Team / Admin)
                                     │
                                     ▼
                       Django Templates + JavaScript
                                     │
                                     ▼
                         Django Modular Monolith
             ┌───────────────┬───────────────┬───────────────┐
             ▼               ▼               ▼               ▼
         Accounts         Events          Photos         Galleries
        (Auth/RBAC)    (Management)    (Upload/Store)   (PIN/Publish)
             │               │               │               │
             └───────────────┴───────┬───────┴───────────────┘
                                     │
                             REST API & Services
                                     │
                         ┌───────────┴───────────┐
                         ▼                       ▼
                Supabase PostgreSQL       Supabase Storage
                (Metadata, RBAC,          (Private 'event-photos'
                 Galleries, PIN hashes)    bucket, signed URLs)
```

---

## Architectural Rationale

1. **Modular Django Monolith**: Avoids premature microservice complexity for an internship MVP while cleanly isolating concerns across four core domain apps (`accounts`, `events`, `photos`, `galleries`).
2. **Why Supabase PostgreSQL**: Provides fully managed, robust PostgreSQL infrastructure with relational integrity, foreign keys, unique constraints, and indexes.
3. **Why Photos are NOT stored in PostgreSQL**: Storing large binary image blobs in relational databases causes table bloat, degrades query performance, impairs backup times, and strains database RAM. Image files belong strictly in object storage.
4. **Why Private Object Storage**: The `event-photos` bucket is private. Photos must never be publicly indexable before curation or outside authorized events.
5. **How Signed URLs Work**: Time-limited cryptographic signed URLs (`/storage/v1/object/sign/...`) are generated server-side on-demand for authorized users and customers with valid session access.
6. **How Role-Based Authorization Works**: Server-side RBAC ensures Team Members cannot publish galleries, access unassigned events, or manage other photographers' photos.
7. **How Customer PIN Authentication Works**: The gallery PIN is never stored in plaintext (hashed with Django's PBKDF2/SHA256 password hashing). A server-side session flag (`gallery_authenticated_<id>`) is granted only upon passing PIN verification, protected against brute force with rate-limiting.

---

## Technology Stack

- **Backend**: Python 3.12+, Django 6.0+, Django REST Framework (DRF)
- **Database**: Supabase PostgreSQL (Production / Development), SQLite (explicit isolated test fallback)
- **Object Storage**: Supabase Storage (private bucket `event-photos`)
- **Frontend**: Django Templates, HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3
- **Authentication**: Django session authentication & cryptographic password hashing (`make_password`)
- **Production Server**: Gunicorn WSGI, WhiteNoise (static files)
- **Deployment Platform**: Render
- **Continuous Integration**: GitHub Actions

---

## User Roles & Permissions Matrix

| Capability | Admin / Lead | Team Member | Customer |
|---|:---:|:---:|:---:|
| Register via Public Form | ❌ (creates Team Member) | ✅ | ❌ (No account needed) |
| Create Admin Account | ✅ (via `createsuperuser`) | ❌ | ❌ |
| Create / Edit Events | ✅ | ❌ (403 Forbidden) | ❌ |
| Add / Remove Team Members | ✅ | ❌ (403 Forbidden) | ❌ |
| View Assigned Events | ✅ (All events) | ✅ (Assigned only) | ❌ |
| Upload Photos | ✅ | ✅ (To assigned events) | ❌ |
| Manage Other Users' Photos | ✅ | ❌ (403 Forbidden) | ❌ |
| Review & Select Photos | ✅ | ❌ | ❌ |
| Create & Publish Gallery | ✅ | ❌ (403 Forbidden) | ❌ |
| Set Gallery PIN | ✅ | ❌ | ❌ |
| Access Published Gallery | ✅ | ✅ | ✅ (Link + Valid PIN) |
| Access Unpublished Photos | ✅ (Authorized event) | ❌ (Denied) | ❌ (404 Not Found) |

---

## Local Development Setup

### Prerequisites
- Python 3.12 or newer
- Git

### 1. Clone the repository
```bash
git clone <repository-url>
cd Photo_Sharing_Platform
```

### 2. Create and activate a virtual environment
**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```
**Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
For local offline testing, `.env` defaults to:
```ini
DEBUG=True
SECRET_KEY=django-insecure-dev-key
DATABASE_ENGINE=sqlite
ALLOWED_HOSTS=localhost,127.0.0.1
```
To connect to live Supabase PostgreSQL and Storage:
```ini
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=event-photos
```

### 5. Apply migrations
```bash
python manage.py migrate
```

### 6. Create initial Administrator
As required by security guidelines, public registration only creates `TEAM_MEMBER` roles. The initial Admin must be created through:
```bash
python manage.py createsuperuser
```

### 7. Run the development server
```bash
python manage.py runserver
```
Access the application at [http://127.0.0.1:8000/](http://127.0.0.1:8000/).

---

## Running Automated Tests

Run the full Django test suite:
```bash
python manage.py test
```

---

## Demo Credentials (Submission Placeholder)

> *Note: Live deployment details will be filled upon completion of deployment in Phase 9.*

- **Live Application URL**: Pending Render Deployment
- **Source Code Repository**: Pending GitHub Push
- **Admin Demo Credentials**:
  - Username: `admin_demo`
  - Password: `AdminPassword2026!`
- **Team Member Demo Credentials**:
  - Username: `team_demo`
  - Password: `TeamPassword2026!`
- **Demo Gallery URL**: Pending
- **Demo Gallery PIN**: Pending

---

## Known Limitations & Planned Enhancements
- Rate limiting on PIN verification is session/IP-based.
- Image processing (thumbnails) will be evaluated as a Phase 9 bonus feature.
